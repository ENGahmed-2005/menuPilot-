<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function adminUser(): array
{
    $token = 'adm-'.uniqid();
    $id = DB::table('users')->insertGetId([
        'name' => 'Admin', 'email' => uniqid().'@admin.test', 'password' => Hash::make('Admin#Pass1234'),
        'role' => 'admin', 'api_token' => hash('sha256', $token), 'created_at' => now(), 'updated_at' => now(),
    ]);

    return ['id' => $id, 'token' => $token];
}

/*
| Owner: table status and orders
*/

it('lets the owner set a table reserved / out of service, which blocks QR check-in', function () {
    $owner = makeOwner();
    $table = makeTable($owner['id'], 'T7');

    $this->patchJson("/api/tables/{$table->id}/status", ['status' => 'out_of_service'], authAs($owner))
        ->assertOk()->assertJsonPath('data.status', 'out_of_service');
    $this->postJson("/api/public/tables/{$table->table_code}/sessions", ['name' => 'Sara', 'phone' => '0599000000', 'latitude' => 31.5, 'longitude' => 34.46])
        ->assertStatus(409)->assertJsonPath('code', 'TABLE_UNAVAILABLE');

    $this->patchJson("/api/tables/{$table->id}/status", ['status' => 'available'], authAs($owner))->assertOk();
    openSession($this, $table);
    // Occupied follows the session: without close_session the API explains instead of changing it.
    $this->patchJson("/api/tables/{$table->id}/status", ['status' => 'reserved'], authAs($owner))
        ->assertStatus(409)->assertJsonPath('code', 'TABLE_HAS_ACTIVE_SESSION')->assertJsonPath('session.lifecycle', 'open');
    $this->patchJson("/api/tables/{$table->id}/status", ['status' => 'occupied'], authAs($owner))->assertStatus(422);
    expect(DB::table('audit_logs')->where('action', 'table.status_changed')->count())->toBe(2);
});

it('lets the owner free an occupied table by ending its session, with a reason when money is owed', function () {
    $owner = makeOwner();
    $waiter = makeStaff($owner['id'], 'waiter');
    $table = makeTable($owner['id'], 'T3');
    $s = openSession($this, $table);

    // Empty session (customer left without ordering): summary first, then close.
    $summary = $this->patchJson("/api/tables/{$table->id}/status", ['status' => 'available'], authAs($owner))
        ->assertStatus(409)->assertJsonPath('code', 'TABLE_HAS_ACTIVE_SESSION')->json('session');
    expect($summary['canClose'])->toBeTrue()->and((float) $summary['outstanding'])->toBe(0.0);
    $this->patchJson("/api/tables/{$table->id}/status", ['status' => 'out_of_service', 'close_session' => true], authAs($owner))
        ->assertOk()->assertJsonPath('data.status', 'out_of_service');
    expect(DB::table('dining_sessions')->where('id', $s['id'])->value('closed_at'))->not->toBeNull();

    // Session with an unpaid order: needs a reason, recorded as a forced close.
    $this->patchJson("/api/tables/{$table->id}/status", ['status' => 'available'], authAs($owner))->assertOk();
    $s2 = openSession($this, $table);
    $this->postJson("/api/public/sessions/{$s2['id']}/orders", ['items' => [['menuItemId' => makeItem($owner['id'], 15), 'quantity' => 1]]]);
    $this->patchJson("/api/tables/{$table->id}/status", ['status' => 'available', 'close_session' => true], authAs($owner))
        ->assertStatus(422)->assertJsonPath('code', 'REASON_REQUIRED');
    // A waiter can't end sessions this way (no close_session / manage_tables).
    $this->patchJson("/api/tables/{$table->id}/status", ['status' => 'available', 'close_session' => true, 'reason' => 'left'], authAs($waiter))->assertForbidden();
    $this->patchJson("/api/tables/{$table->id}/status", ['status' => 'available', 'close_session' => true, 'reason' => 'Customer walked out'], authAs($owner))
        ->assertOk()->assertJsonPath('data.status', 'available');

    $log = DB::table('audit_logs')->where('action', 'session.force_closed')->first();
    expect($log)->not->toBeNull()->and(json_decode($log->metadata, true)['outstanding'])->toEqual(15);
});

it('refuses to end a session from the table card while a customer payment awaits verification', function () {
    $owner = makeOwner();
    $table = makeTable($owner['id']);
    $s = openSession($this, $table);
    DB::table('payments')->insert(['dining_session_id' => $s['id'], 'method' => 'bank', 'status' => 'pending', 'amount' => 10, 'created_at' => now(), 'updated_at' => now()]);

    $this->patchJson("/api/tables/{$table->id}/status", ['status' => 'available', 'close_session' => true, 'reason' => 'x x x'], authAs($owner))
        ->assertStatus(409)->assertJsonPath('code', 'PAYMENT_PENDING_VERIFICATION');
});

it('lets the owner edit tables and manage order status and cancellation', function () {
    $owner = makeOwner();
    $table = makeTable($owner['id'], 'T1');
    $this->putJson("/api/tables/{$table->id}", ['label' => 'Patio 1', 'seats' => 6], authAs($owner))->assertOk();

    $s = openSession($this, $table);
    $orderId = $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => makeItem($owner['id'], 12), 'quantity' => 2]]])->json('data.id');

    $this->patchJson("/api/orders/{$orderId}/status", ['status' => 'preparing'], authAs($owner))->assertOk()->assertJsonPath('data.status', 'preparing');
    $this->postJson("/api/orders/{$orderId}/cancel", ['reason' => ''], authAs($owner))->assertStatus(422);
    $this->postJson("/api/orders/{$orderId}/cancel", ['reason' => 'Customer left'], authAs($owner))->assertOk()->assertJsonPath('data.status', 'cancelled');

    expect(DB::table('order_items')->where('order_id', $orderId)->value('status'))->toBe('cancelled')
        ->and(DB::table('audit_logs')->where('action', 'order.cancelled')->exists())->toBeTrue();
    $this->postJson("/api/orders/{$orderId}/cancel", ['reason' => 'again'], authAs($owner))->assertStatus(409);
});

it('keeps table status and order actions inside the owner restaurant and away from kitchen', function () {
    $a = makeOwner('A');
    $b = makeOwner('B');
    $kitchen = makeStaff($a['id'], 'kitchen');
    $table = makeTable($a['id']);
    $s = openSession($this, $table);
    $orderId = $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => makeItem($a['id']), 'quantity' => 1]]])->json('data.id');

    $this->patchJson("/api/tables/{$table->id}/status", ['status' => 'reserved'], authAs($b))->assertNotFound();
    $this->postJson("/api/orders/{$orderId}/cancel", ['reason' => 'x x'], authAs($b))->assertNotFound();
    $this->patchJson("/api/tables/{$table->id}/status", ['status' => 'reserved'], authAs($kitchen))->assertForbidden();
    $this->postJson("/api/orders/{$orderId}/cancel", ['reason' => 'x x'], authAs($kitchen))->assertForbidden();
});

/*
| Admin: restaurants
*/

it('lets the admin create, edit, re-plan and delete a restaurant', function () {
    $admin = adminUser();

    $created = $this->postJson('/api/admin/restaurants', [
        'name' => 'Lina', 'email' => 'lina@resto.test', 'restaurant_name' => 'Lina Grill', 'plan' => 'trial',
    ], authAs($admin))->assertCreated()->json('data');
    $id = $created['restaurant']['id'];
    expect($created['generated_password'])->toBeString()
        ->and($created['restaurant']['role'])->toBe('owner')
        ->and($created['restaurant']['trial_ends_at'])->not->toBeNull();

    // The new owner can sign in with the generated password.
    $this->postJson('/api/auth/login', ['email' => 'lina@resto.test', 'password' => $created['generated_password']])->assertOk();

    $this->patchJson("/api/admin/restaurants/{$id}", ['name' => 'Lina H', 'email' => 'lina@resto.test', 'restaurant_name' => 'Lina Grill & Co'], authAs($admin))
        ->assertOk()->assertJsonPath('data.restaurant_name', 'Lina Grill & Co');
    $this->patchJson("/api/admin/restaurants/{$id}/plan", ['plan' => 'pro'], authAs($admin))->assertOk()->assertJsonPath('data.plan', 'pro');

    makeTable($id, 'T1');
    makeStaff($id, 'cashier');
    $this->deleteJson("/api/admin/restaurants/{$id}", ['confirm_email' => 'wrong@x.test'], authAs($admin))->assertStatus(422);
    $this->deleteJson("/api/admin/restaurants/{$id}", ['confirm_email' => 'LINA@resto.test'], authAs($admin))->assertOk();

    expect(DB::table('users')->where('id', $id)->exists())->toBeFalse()
        ->and(DB::table('restaurant_tables')->where('user_id', $id)->exists())->toBeFalse()
        ->and(DB::table('staff')->where('user_id', $id)->exists())->toBeFalse()
        ->and(DB::table('users')->where('role', 'cashier')->exists())->toBeFalse()
        ->and(DB::table('audit_logs')->whereIn('action', ['admin.restaurant_created', 'admin.restaurant_deleted'])->count())->toBe(2);
});

it('refuses to delete a restaurant with an open table session', function () {
    $admin = adminUser();
    $owner = makeOwner();
    $email = DB::table('users')->where('id', $owner['id'])->value('email');
    openSession($this, makeTable($owner['id']));

    $this->deleteJson("/api/admin/restaurants/{$owner['id']}", ['confirm_email' => $email], authAs($admin))
        ->assertStatus(409)->assertJsonPath('code', 'RESTAURANT_HAS_ACTIVE_SESSIONS');
});

it('forbids owners and staff from admin restaurant management', function () {
    $owner = makeOwner();
    foreach ([$owner, makeStaff($owner['id'], 'manager')] as $user) {
        $this->postJson('/api/admin/restaurants', ['name' => 'X', 'email' => 'x@x.test', 'restaurant_name' => 'X'], authAs($user))->assertForbidden();
        $this->deleteJson("/api/admin/restaurants/{$owner['id']}", ['confirm_email' => 'x'], authAs($user))->assertForbidden();
    }
});
