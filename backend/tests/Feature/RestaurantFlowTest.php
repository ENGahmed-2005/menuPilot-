<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function makeOwner(string $name = 'Owner'): array
{
    $token = Str::random(40);
    $id = DB::table('users')->insertGetId([
        'name' => $name,
        'restaurant_name' => $name.' Restaurant',
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

function makeStaff(int $ownerId, string $role): array
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

function makeTable(int $ownerId, string $label = 'T1'): object
{
    $id = DB::table('restaurant_tables')->insertGetId([
        'user_id' => $ownerId,
        'label' => $label,
        'table_code' => Str::random(24),
        'status' => 'available',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return DB::table('restaurant_tables')->find($id);
}

function makeItem(int $ownerId, float $price = 10, int $prep = 15): int
{
    return DB::table('menu_items')->insertGetId([
        'user_id' => $ownerId,
        'name' => 'Item '.Str::random(4),
        'price' => $price,
        'is_available' => true,
        'prep_time_minutes' => $prep,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

function authAs(array $user): array
{
    return ['Authorization' => 'Bearer '.$user['token'], 'Accept' => 'application/json'];
}

function openSession($test, object $table, string $name = 'Sara'): array
{
    return $test->postJson("/api/public/tables/{$table->table_code}/sessions", [
        'name' => $name,
        'phone' => '0599000000',
        'latitude' => 31.5,
        'longitude' => 34.46,
    ])->json('data');
}

/*
|--------------------------------------------------------------------------
| Sprint 3 — sessions, ordering, waiter calls
|--------------------------------------------------------------------------
*/

it('attaches a second diner to the existing active session (US-08)', function () {
    $owner = makeOwner();
    $table = makeTable($owner['id']);

    $first = openSession($this, $table, 'Sara');
    $second = $this->postJson("/api/public/tables/{$table->table_code}/sessions", [
        'name' => 'Omar', 'phone' => '0599111111', 'latitude' => 31.5, 'longitude' => 34.46,
    ])->assertOk()->json('data');

    expect($second['id'])->toBe($first['id'])
        ->and($second['resumed'])->toBeTrue()
        ->and(DB::table('dining_sessions')->count())->toBe(1);
});

it('submits orders with sequential numbers per restaurant (US-10)', function () {
    $owner = makeOwner();
    $other = makeOwner('Other');
    $item = makeItem($owner['id'], 12);
    $otherItem = makeItem($other['id'], 5);

    $s1 = openSession($this, makeTable($owner['id'], 'A'));
    $s2 = openSession($this, makeTable($other['id'], 'B'));

    $n1 = $this->postJson("/api/public/sessions/{$s1['id']}/orders", ['items' => [['menuItemId' => $item, 'quantity' => 2, 'note' => 'no onions']]])
        ->assertCreated()->json('data.order_number');
    $n2 = $this->postJson("/api/public/sessions/{$s1['id']}/orders", ['items' => [['menuItemId' => $item, 'quantity' => 1]]])
        ->assertCreated()->json('data.order_number');
    $otherN = $this->postJson("/api/sessions/{$s2['id']}/orders", ['items' => [['menuItemId' => $otherItem, 'quantity' => 1]]])
        ->assertCreated()->json('data.order_number');

    expect([$n1, $n2, $otherN])->toBe([1, 2, 1]);
    expect(DB::table('order_items')->where('note', 'no onions')->exists())->toBeTrue();
});

it('rejects an empty cart and items from another restaurant', function () {
    $owner = makeOwner();
    $other = makeOwner('Other');
    $s = openSession($this, makeTable($owner['id']));

    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => []])
        ->assertStatus(422)
        ->assertJsonPath('message', 'Add at least one item before placing your order.');

    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => makeItem($other['id']), 'quantity' => 1]]])
        ->assertStatus(422);
});

it('deduplicates waiter calls and lets staff resolve them (US-11)', function () {
    $owner = makeOwner();
    $waiter = makeStaff($owner['id'], 'waiter');
    $s = openSession($this, makeTable($owner['id']));

    $this->postJson("/api/public/sessions/{$s['id']}/assistance-requests", ['note' => 'Water please'])->assertCreated();
    $this->postJson("/api/sessions/{$s['id']}/call-waiter")->assertOk()->assertJsonPath('data.duplicate', true);
    expect(DB::table('assistance_requests')->count())->toBe(1);

    $sessions = $this->getJson('/api/sessions', authAs($waiter))->assertOk()->json('data');
    expect($sessions[0]['assistanceRequested'])->toBeTrue()
        ->and($sessions[0]['assistanceRequest']['note'])->toBe('Water please')
        ->and($sessions[0]['tableLabel'])->toBe('T1');

    $this->postJson("/api/sessions/{$s['id']}/assistance/resolve", [], authAs($waiter))->assertOk()->assertJsonPath('data.resolved', 1);
    expect($this->getJson('/api/sessions', authAs($waiter))->json('data.0.assistanceRequested'))->toBeFalse();
});

/*
|--------------------------------------------------------------------------
| Sprint 4 — kitchen
|--------------------------------------------------------------------------
*/

it('moves orders forward only and records timestamped history (US-13)', function () {
    $owner = makeOwner();
    $kitchen = makeStaff($owner['id'], 'kitchen');
    $s = openSession($this, makeTable($owner['id']));
    $orderId = $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => makeItem($owner['id']), 'quantity' => 1]]])->json('data.id');

    // Skipping a step is rejected.
    $this->patchJson("/api/kitchen/orders/{$orderId}/status", ['status' => 'ready'], authAs($kitchen))
        ->assertStatus(422)->assertJsonPath('code', 'INVALID_STATUS_TRANSITION');

    // Capitalised values from the React dashboard are accepted.
    $this->patchJson("/api/kitchen/orders/{$orderId}/status", ['status' => 'Preparing'], authAs($kitchen))->assertOk();
    $this->patchJson("/api/kitchen/orders/{$orderId}/status", ['status' => 'ready'], authAs($kitchen))->assertOk();

    // Going back is rejected.
    $this->patchJson("/api/kitchen/orders/{$orderId}/status", ['status' => 'preparing'], authAs($kitchen))->assertStatus(422);

    $history = DB::table('order_status_histories')->where('order_id', $orderId)->orderBy('id')->pluck('to_status')->all();
    expect($history)->toBe(['pending', 'preparing', 'ready']);
    $order = DB::table('orders')->find($orderId);
    expect($order->preparing_at)->not->toBeNull()->and($order->ready_at)->not->toBeNull();
});

it('returns the kitchen queue in the shape the dashboard reads (US-12, US-14)', function () {
    $owner = makeOwner();
    $kitchen = makeStaff($owner['id'], 'kitchen');
    $s = openSession($this, makeTable($owner['id'], 'Patio 3'));
    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => makeItem($owner['id'], 10, 25), 'quantity' => 2, 'note' => 'spicy']]]);

    $order = $this->getJson('/api/kitchen/orders?sort_by=prepTime', authAs($kitchen))->assertOk()->json('data.0');

    expect($order['status'])->toBe('Pending')
        ->and($order['orderNumber'])->toBe(1)
        ->and($order['tableLabel'])->toBe('Patio 3')
        ->and($order['expectedPrepMinutes'])->toBe(25)
        ->and($order['avgPrepTimeMinutes'])->toBe(15)
        ->and($order['items'][0]['note'])->toBe('spicy')
        ->and($order)->toHaveKeys(['submittedAt', 'elapsedMinutes', 'isLate']);
});

/*
|--------------------------------------------------------------------------
| Sprint 5 — billing
|--------------------------------------------------------------------------
*/

it('requires an order before the bill can be requested (US-16)', function () {
    $owner = makeOwner();
    $s = openSession($this, makeTable($owner['id']));

    $this->postJson("/api/public/sessions/{$s['id']}/bill-request")->assertStatus(422);

    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => makeItem($owner['id']), 'quantity' => 1]]]);
    $this->postJson("/api/sessions/{$s['id']}/request-bill")->assertOk();

    expect(DB::table('dining_sessions')->value('status'))->toBe('bill_requested');
});

it('combines all session orders, takes payment and frees the table (US-17)', function () {
    $owner = makeOwner();
    $cashier = makeStaff($owner['id'], 'cashier');
    $table = makeTable($owner['id']);
    $s = openSession($this, $table);
    $burger = makeItem($owner['id'], 18);
    $juice = makeItem($owner['id'], 6);

    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => $burger, 'quantity' => 2]]]);
    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => $juice, 'quantity' => 1]]]);

    $bill = $this->getJson("/api/sessions/{$s['id']}/bill", authAs($cashier))->assertOk()->json('data');
    expect((float) $bill['total'])->toBe(42.0)->and($bill['items'])->toHaveCount(2);

    // Closing before payment is blocked.
    $this->postJson("/api/sessions/{$s['id']}/close", [], authAs($cashier))
        ->assertStatus(422)->assertJsonPath('message', 'Payment must be recorded before closing the session.');

    $this->postJson("/api/sessions/{$s['id']}/payment", ['method' => 'cash', 'close' => false], authAs($cashier))
        ->assertCreated()->assertJsonPath('data.status', 'verified');
    $this->postJson("/api/sessions/{$s['id']}/close", [], authAs($cashier))->assertOk()->assertJsonPath('data.status', 'closed');

    expect(DB::table('restaurant_tables')->where('id', $table->id)->value('status'))->toBe('available');
    expect((float) DB::table('payments')->value('amount'))->toBe(42.0);
});

it('does not charge again for orders already paid in the pay-first flow', function () {
    $owner = makeOwner();
    $cashier = makeStaff($owner['id'], 'cashier');
    $s = openSession($this, makeTable($owner['id']));
    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => makeItem($owner['id'], 20), 'quantity' => 1]]]);
    DB::table('payments')->insert(['dining_session_id' => $s['id'], 'method' => 'bank', 'status' => 'verified', 'amount' => 20, 'created_at' => now(), 'updated_at' => now()]);

    $bill = $this->getJson("/api/sessions/{$s['id']}/bill", authAs($cashier))->json('data');
    expect((float) $bill['outstanding'])->toBe(0.0);
    $this->postJson("/api/sessions/{$s['id']}/close", [], authAs($cashier))->assertOk();
});

it('records USSD payments for reconciliation and audits adjustments (US-18)', function () {
    $owner = makeOwner();
    $cashier = makeStaff($owner['id'], 'cashier');
    $s = openSession($this, makeTable($owner['id']));
    $orderItemId = DB::table('order_items')->where('order_id',
        $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => makeItem($owner['id'], 12), 'quantity' => 1]]])->json('data.id')
    )->value('id');

    $bill = $this->patchJson("/api/sessions/{$s['id']}/bill-items/{$orderItemId}", ['new_price' => 10, 'reason' => 'Loyalty'], authAs($cashier))
        ->assertOk()->json('data');
    expect((float) $bill['total'])->toBe(10.0);
    $adj = DB::table('bill_adjustments')->first();
    expect((float) $adj->old_price)->toBe(12.0)->and((float) $adj->new_price)->toBe(10.0)->and($adj->cashier_id)->toBe($cashier['id']);

    $payment = $this->postJson("/api/sessions/{$s['id']}/payment", ['method' => 'ussd'], authAs($cashier))->assertCreated()->json('data');
    expect($payment['status'])->toBe('pending_reconciliation');
    expect(DB::table('dining_sessions')->value('status'))->toBe('closed');

    $this->postJson("/api/payments/{$payment['id']}/reconcile", [], authAs($cashier))->assertOk()->assertJsonPath('data.reconciliation_status', 'reconciled');
});

/*
|--------------------------------------------------------------------------
| Sprint 6 — cancellation and reassignment
|--------------------------------------------------------------------------
*/

it('requires a reason to cancel and removes the item from the kitchen (US-19)', function () {
    $owner = makeOwner();
    $cashier = makeStaff($owner['id'], 'cashier');
    $kitchen = makeStaff($owner['id'], 'kitchen');
    $s = openSession($this, makeTable($owner['id']));
    $orderId = $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => makeItem($owner['id']), 'quantity' => 1]]])->json('data.id');
    $itemId = DB::table('order_items')->where('order_id', $orderId)->value('id');

    $this->postJson("/api/order-items/{$itemId}/cancel", ['reason' => ''], authAs($cashier))
        ->assertStatus(422)->assertJsonPath('message', 'A reason is required to cancel this item.');

    $this->postJson("/api/order-items/{$itemId}/cancel", ['reason' => 'Customer changed their mind'], authAs($cashier))->assertOk();

    $item = DB::table('order_items')->find($itemId);
    expect($item->status)->toBe('cancelled')
        ->and($item->cancelled_by)->toBe($cashier['id'])
        ->and($item->cancelled_at)->not->toBeNull();
    expect($this->getJson('/api/kitchen/orders', authAs($kitchen))->json('data'))->toBe([]);
});

it('reassigns a cancelled item to another active session without double billing (US-20)', function () {
    $owner = makeOwner();
    $waiter = makeStaff($owner['id'], 'waiter');
    $cashier = makeStaff($owner['id'], 'cashier');
    $from = openSession($this, makeTable($owner['id'], 'T3'));
    $to = openSession($this, makeTable($owner['id'], 'T5'));
    $orderId = $this->postJson("/api/public/sessions/{$from['id']}/orders", ['items' => [['menuItemId' => makeItem($owner['id'], 9), 'quantity' => 1]]])->json('data.id');
    $itemId = DB::table('order_items')->where('order_id', $orderId)->value('id');

    // Active items cannot be reassigned.
    $this->postJson("/api/order-items/{$itemId}/reassign", ['target_session_id' => $to['id']], authAs($waiter))->assertStatus(422);

    $this->postJson("/api/order-items/{$itemId}/cancel", ['reason' => 'Wrong table'], authAs($waiter));
    $res = $this->postJson("/api/order-items/{$itemId}/reassign", ['target_session_id' => $to['id']], authAs($waiter))->assertCreated()->json('data');

    expect($res['reassigned']['reassigned_from_item_id'])->toBe($itemId);
    expect((float) $this->getJson("/api/sessions/{$from['id']}/bill", authAs($cashier))->json('data.total'))->toBe(0.0);
    expect((float) $this->getJson("/api/sessions/{$to['id']}/bill", authAs($cashier))->json('data.total'))->toBe(9.0);
});

/*
|--------------------------------------------------------------------------
| US-15 / US-23 — tenant isolation
|--------------------------------------------------------------------------
*/

it('never exposes another restaurant\'s data (US-15, US-23)', function () {
    $a = makeOwner('A');
    $b = makeOwner('B');
    $bCashier = makeStaff($b['id'], 'cashier');
    $bKitchen = makeStaff($b['id'], 'kitchen');
    $s = openSession($this, makeTable($a['id']));
    $orderId = $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => makeItem($a['id']), 'quantity' => 1]]])->json('data.id');
    $itemId = DB::table('order_items')->where('order_id', $orderId)->value('id');

    $this->getJson("/api/owner/orders/{$orderId}", authAs($b))->assertNotFound();
    expect($this->getJson('/api/owner/orders', authAs($b))->json('data'))->toBe([]);
    expect($this->getJson('/api/sessions', authAs($bCashier))->json('data'))->toBe([]);
    expect($this->getJson('/api/kitchen/orders', authAs($bKitchen))->json('data'))->toBe([]);
    $this->patchJson("/api/kitchen/orders/{$orderId}/status", ['status' => 'preparing'], authAs($bKitchen))->assertNotFound();
    $this->getJson("/api/sessions/{$s['id']}/bill", authAs($bCashier))->assertNotFound();
    $this->postJson("/api/sessions/{$s['id']}/payment", ['method' => 'cash'], authAs($bCashier))->assertNotFound();
    $this->postJson("/api/sessions/{$s['id']}/close", [], authAs($bCashier))->assertNotFound();
    $this->postJson("/api/order-items/{$itemId}/cancel", ['reason' => 'x x'], authAs($bCashier))->assertNotFound();

    // Owner A still sees their own order.
    $this->getJson("/api/owner/orders/{$orderId}", authAs($a))->assertOk()->assertJsonPath('data.id', $orderId);
});

it('rejects unauthenticated access to protected endpoints (US-23)', function () {
    foreach (['/api/sessions', '/api/kitchen/orders', '/api/owner/orders', '/api/tables', '/api/menu-items'] as $url) {
        $this->getJson($url)->assertUnauthorized();
    }
});

it('forbids kitchen staff from billing actions (role-based access)', function () {
    $owner = makeOwner();
    $kitchen = makeStaff($owner['id'], 'kitchen');
    $s = openSession($this, makeTable($owner['id']));

    $this->postJson("/api/sessions/{$s['id']}/payment", ['method' => 'cash'], authAs($kitchen))->assertForbidden();
});
