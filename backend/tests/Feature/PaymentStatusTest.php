<?php

use App\Enums\PaymentStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

// ─── helpers ──────────────────────────────────────────────────────────────────

function psOwner(): array
{
    $token = Str::random(40);
    $id = DB::table('users')->insertGetId([
        'name' => 'Owner',
        'restaurant_name' => 'Test Restaurant',
        'email' => Str::lower(Str::random(8)).'@example.test',
        'password' => Hash::make('Secret#123'),
        'role' => 'owner',
        'plan' => 'pro',
        'api_token' => hash('sha256', $token),
        'latitude' => 31.5,
        'longitude' => 34.46,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return ['id' => $id, 'token' => $token];
}

function psStaff(int $ownerId, string $role): array
{
    $token = Str::random(40);
    $id = DB::table('users')->insertGetId([
        'name' => ucfirst($role),
        'email' => Str::lower(Str::random(8)).'@staff.test',
        'password' => Hash::make('Secret#123'),
        'role' => $role,
        'api_token' => hash('sha256', $token),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('staff')->insert([
        'user_id' => $ownerId,
        'account_user_id' => $id,
        'name' => ucfirst($role),
        'role' => $role,
        'active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return ['id' => $id, 'token' => $token];
}

function psTable(int $ownerId): object
{
    $id = DB::table('restaurant_tables')->insertGetId([
        'user_id' => $ownerId,
        'label' => 'T-'.Str::random(4),
        'table_code' => Str::random(24),
        'status' => 'available',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return DB::table('restaurant_tables')->find($id);
}

function psItem(int $ownerId, float $price = 20): int
{
    return DB::table('menu_items')->insertGetId([
        'user_id' => $ownerId,
        'name' => 'Dish '.Str::random(4),
        'price' => $price,
        'is_available' => true,
        'prep_time_minutes' => 10,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

function psSession($test, object $table): array
{
    return $test->postJson("/api/public/tables/{$table->table_code}/sessions", [
        'name' => 'Diner',
        'phone' => '0599000001',
        'latitude' => 31.5,
        'longitude' => 34.46,
    ])->assertCreated()->json('data');
}

function auth(array $user): array
{
    return ['Authorization' => 'Bearer '.$user['token'], 'Accept' => 'application/json'];
}

function insertPayment(array $overrides = []): int
{
    return DB::table('payments')->insertGetId(array_merge([
        'dining_session_id' => 1,
        'method' => 'cash',
        'status' => PaymentStatus::Pending->value,
        'amount' => 100,
        'created_at' => now(),
        'updated_at' => now(),
    ], $overrides));
}

// ─── PaymentStatus enum ────────────────────────────────────────────────────────

it('PaymentStatus settled() includes verified and pending_reconciliation only', function () {
    expect(PaymentStatus::settled())
        ->toContain(PaymentStatus::Verified->value)
        ->toContain(PaymentStatus::PendingReconciliation->value)
        ->not->toContain(PaymentStatus::Pending->value)
        ->not->toContain(PaymentStatus::Rejected->value);
});

it('PaymentStatus actionable() includes pending and pending_reconciliation only', function () {
    expect(PaymentStatus::actionable())
        ->toContain(PaymentStatus::Pending->value)
        ->toContain(PaymentStatus::PendingReconciliation->value)
        ->not->toContain(PaymentStatus::Verified->value)
        ->not->toContain(PaymentStatus::Rejected->value);
});

it('isSettled() returns true only for verified and pending_reconciliation', function () {
    expect(PaymentStatus::Verified->isSettled())->toBeTrue()
        ->and(PaymentStatus::PendingReconciliation->isSettled())->toBeTrue()
        ->and(PaymentStatus::Pending->isSettled())->toBeFalse()
        ->and(PaymentStatus::Rejected->isSettled())->toBeFalse();
});

// ─── Customer-pay flow (PaymentController) ────────────────────────────────────

it('cashier can verify a pending customer payment', function () {
    $owner = psOwner();
    $cashier = psStaff($owner['id'], 'cashier');
    $table = psTable($owner['id']);
    $item = psItem($owner['id'], 50);
    $session = psSession($this, $table);

    // Customer submits payment
    $orderId = DB::table('orders')->insertGetId([
        'dining_session_id' => $session['id'],
        'user_id' => $owner['id'],
        'order_number' => 1,
        'status' => 'payment_pending',
        'submitted_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $paymentId = DB::table('payments')->insertGetId([
        'dining_session_id' => $session['id'],
        'order_id' => $orderId,
        'method' => 'bank',
        'status' => PaymentStatus::Pending->value,
        'amount' => 50,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->postJson("/api/payments/{$paymentId}/verify", [], auth($cashier))
        ->assertOk();

    expect(DB::table('payments')->find($paymentId)->status)
        ->toBe(PaymentStatus::Verified->value);

    expect(DB::table('orders')->find($orderId)->status)
        ->toBe('pending');
});

it('cashier can reject a pending customer payment', function () {
    $owner = psOwner();
    $cashier = psStaff($owner['id'], 'cashier');
    $table = psTable($owner['id']);
    $session = psSession($this, $table);

    $orderId = DB::table('orders')->insertGetId([
        'dining_session_id' => $session['id'],
        'user_id' => $owner['id'],
        'order_number' => 1,
        'status' => 'payment_pending',
        'submitted_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $paymentId = DB::table('payments')->insertGetId([
        'dining_session_id' => $session['id'],
        'order_id' => $orderId,
        'method' => 'wallet',
        'status' => PaymentStatus::Pending->value,
        'amount' => 40,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->postJson("/api/payments/{$paymentId}/reject", ['reason' => 'Proof unclear'], auth($cashier))
        ->assertOk();

    expect(DB::table('payments')->find($paymentId)->status)
        ->toBe(PaymentStatus::Rejected->value);

    expect(DB::table('orders')->find($orderId)->status)
        ->toBe('cancelled');
});

it('cannot verify a payment that is not in pending status', function () {
    $owner = psOwner();
    $cashier = psStaff($owner['id'], 'cashier');
    $table = psTable($owner['id']);
    $session = psSession($this, $table);

    $orderId = DB::table('orders')->insertGetId([
        'dining_session_id' => $session['id'],
        'user_id' => $owner['id'],
        'order_number' => 1,
        'status' => 'pending',
        'submitted_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    // Already verified payment
    $paymentId = DB::table('payments')->insertGetId([
        'dining_session_id' => $session['id'],
        'order_id' => $orderId,
        'method' => 'bank',
        'status' => PaymentStatus::Verified->value,
        'amount' => 30,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->postJson("/api/payments/{$paymentId}/verify", [], auth($cashier))
        ->assertStatus(409);
});

// ─── Cashier billing flow (BillingController) ─────────────────────────────────

it('cashier pay sets status to verified for cash payments', function () {
    $owner = psOwner();
    $cashier = psStaff($owner['id'], 'cashier');
    $table = psTable($owner['id']);
    $item = psItem($owner['id'], 30);
    $session = psSession($this, $table);

    // Place an order
    $orderId = DB::table('orders')->insertGetId([
        'dining_session_id' => $session['id'],
        'user_id' => $owner['id'],
        'order_number' => 1,
        'status' => 'served',
        'submitted_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('order_items')->insert([
        'order_id' => $orderId,
        'menu_item_id' => $item,
        'quantity' => 1,
        'unit_price' => 30,
        'status' => 'active',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->postJson("/api/sessions/{$session['id']}/payment", ['method' => 'cash', 'close' => false], auth($cashier))
        ->assertCreated();

    $payment = DB::table('payments')->where('dining_session_id', $session['id'])->first();
    expect($payment->status)->toBe(PaymentStatus::Verified->value);
});

it('cashier pay sets status to pending_reconciliation for USSD', function () {
    $owner = psOwner();
    $cashier = psStaff($owner['id'], 'cashier');
    $table = psTable($owner['id']);
    $item = psItem($owner['id'], 25);
    $session = psSession($this, $table);

    $orderId = DB::table('orders')->insertGetId([
        'dining_session_id' => $session['id'],
        'user_id' => $owner['id'],
        'order_number' => 1,
        'status' => 'served',
        'submitted_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('order_items')->insert([
        'order_id' => $orderId,
        'menu_item_id' => $item,
        'quantity' => 1,
        'unit_price' => 25,
        'status' => 'active',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->postJson("/api/sessions/{$session['id']}/payment", ['method' => 'ussd', 'close' => false], auth($cashier))
        ->assertCreated();

    $payment = DB::table('payments')->where('dining_session_id', $session['id'])->first();
    expect($payment->status)->toBe(PaymentStatus::PendingReconciliation->value);
});

it('reconcile moves pending_reconciliation to verified', function () {
    $owner = psOwner();
    $cashier = psStaff($owner['id'], 'cashier');
    $table = psTable($owner['id']);
    $session = psSession($this, $table);

    $paymentId = DB::table('payments')->insertGetId([
        'dining_session_id' => $session['id'],
        'method' => 'ussd',
        'status' => PaymentStatus::PendingReconciliation->value,
        'reconciliation_status' => 'pending',
        'amount' => 60,
        'paid_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->postJson("/api/payments/{$paymentId}/reconcile", [], auth($cashier))
        ->assertOk();

    $payment = DB::table('payments')->find($paymentId);
    expect($payment->status)->toBe(PaymentStatus::Verified->value)
        ->and($payment->reconciliation_status)->toBe('reconciled');
});

it('cannot reconcile a payment that is not pending_reconciliation', function () {
    $owner = psOwner();
    $cashier = psStaff($owner['id'], 'cashier');
    $table = psTable($owner['id']);
    $session = psSession($this, $table);

    $paymentId = DB::table('payments')->insertGetId([
        'dining_session_id' => $session['id'],
        'method' => 'cash',
        'status' => PaymentStatus::Verified->value,
        'amount' => 60,
        'paid_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->postJson("/api/payments/{$paymentId}/reconcile", [], auth($cashier))
        ->assertStatus(409);
});

// ─── Double-pay guard ─────────────────────────────────────────────────────────

it('blocks cashier billing payment when customer pending payment exists', function () {
    $owner = psOwner();
    $cashier = psStaff($owner['id'], 'cashier');
    $table = psTable($owner['id']);
    $item = psItem($owner['id'], 40);
    $session = psSession($this, $table);

    $orderId = DB::table('orders')->insertGetId([
        'dining_session_id' => $session['id'],
        'user_id' => $owner['id'],
        'order_number' => 1,
        'status' => 'payment_pending',
        'submitted_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('order_items')->insert([
        'order_id' => $orderId,
        'menu_item_id' => $item,
        'quantity' => 1,
        'unit_price' => 40,
        'status' => 'active',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Customer payment already pending
    DB::table('payments')->insert([
        'dining_session_id' => $session['id'],
        'order_id' => $orderId,
        'method' => 'bank',
        'status' => PaymentStatus::Pending->value,
        'amount' => 40,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Cashier tries to record another payment via billing flow – should be blocked
    $this->postJson("/api/sessions/{$session['id']}/payment", ['method' => 'cash', 'close' => false], auth($cashier))
        ->assertStatus(409);
});

it('blocks second customer payment submission when one is already pending', function () {
    $owner = psOwner();
    $table = psTable($owner['id']);
    $item = psItem($owner['id'], 15);
    $session = psSession($this, $table);

    // First payment submission
    DB::table('payments')->insert([
        'dining_session_id' => $session['id'],
        'method' => 'bank',
        'status' => PaymentStatus::Pending->value,
        'amount' => 15,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Second customer attempt (via multipart form would normally go through submit)
    // We test the guard directly by asserting 409.
    $this->postJson("/api/public/sessions/{$session['id']}/payment", [
        'method' => 'bank',
        'payer_name' => 'Ali',
        'payer_phone' => '0599111222',
        'items' => json_encode([['menuItemId' => $item, 'quantity' => 1]]),
    ])->assertStatus(409);
});
