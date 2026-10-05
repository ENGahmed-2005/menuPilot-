<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function paidAndClosedSession($test, int $ownerId, array $cashier): array
{
    $s = openSession($test, makeTable($ownerId));
    $orderId = $test->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => makeItem($ownerId, 20), 'quantity' => 1]]], customer($s))->json('data.id');
    $test->postJson("/api/sessions/{$s['id']}/payment", ['method' => 'cash'], authAs($cashier))->assertCreated(); // pays and closes

    return ['session' => $s, 'orderId' => $orderId, 'itemId' => DB::table('order_items')->where('order_id', $orderId)->value('id')];
}

it('records who closed the session', function () {
    $owner = makeOwner();
    $cashier = makeStaff($owner['id'], 'cashier');
    ['session' => $s] = paidAndClosedSession($this, $owner['id'], $cashier);

    expect(DB::table('dining_sessions')->where('id', $s['id'])->value('closed_by'))->toBe($cashier['id']);
});

it('refuses to change the orders of a closed, paid session', function () {
    $owner = makeOwner();
    $cashier = makeStaff($owner['id'], 'cashier');
    ['session' => $s, 'orderId' => $orderId, 'itemId' => $itemId] = paidAndClosedSession($this, $owner['id'], $cashier);

    $this->postJson("/api/order-items/{$itemId}/cancel", ['reason' => 'after close'], authAs($owner))->assertStatus(409)->assertJsonPath('code', 'SESSION_CLOSED');
    $this->postJson("/api/orders/{$orderId}/cancel", ['reason' => 'after close'], authAs($owner))->assertStatus(409)->assertJsonPath('code', 'SESSION_CLOSED');
    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => makeItem($owner['id']), 'quantity' => 1]]], customer($s))->assertStatus(409);
    $this->postJson("/api/public/sessions/{$s['id']}/assistance-requests", [], customer($s))->assertStatus(409);

    // Invoice and payment records are preserved.
    expect(DB::table('order_items')->where('id', $itemId)->value('status'))->toBe('active')
        ->and(DB::table('payments')->where('dining_session_id', $s['id'])->count())->toBe(1);
});

it('keeps the platform admin out of restaurant operations', function () {
    $token = 'adm-'.uniqid();
    DB::table('users')->insert(['name' => 'Admin', 'email' => 'a@x.test', 'password' => Hash::make('x'), 'role' => 'admin', 'api_token' => hash('sha256', $token), 'created_at' => now(), 'updated_at' => now()]);
    $admin = ['token' => $token];

    foreach (['/api/tables', '/api/sessions', '/api/kitchen/orders', '/api/staff', '/api/payments/pending'] as $url) {
        $this->getJson($url, authAs($admin))->assertForbidden();
    }
    $this->getJson('/api/admin/restaurants', authAs($admin))->assertOk();
    expect($this->getJson('/api/auth/me', authAs($admin))->json('data.permissions'))->toEqualCanonicalizing(['manage_users', 'manage_admin']);
});

it('gives a manager read-only access until the owner grants more', function () {
    $owner = makeOwner();
    $manager = makeStaff($owner['id'], 'manager');

    $this->getJson('/api/owner/orders', authAs($manager))->assertOk();
    $this->getJson('/api/tables', authAs($manager))->assertOk();
    $this->postJson('/api/tables', ['label' => 'M1', 'seats' => 2], authAs($manager))->assertForbidden();
    $this->getJson('/api/staff', authAs($manager))->assertForbidden();

    $staffId = DB::table('staff')->where('account_user_id', $manager['id'])->value('id');
    $this->patchJson("/api/staff/{$staffId}", ['permissions' => ['view_tables', 'manage_tables']], authAs($owner))->assertOk();
    DB::table('users')->where('id', $manager['id'])->update(['api_token' => hash('sha256', 'mgr-2')]);
    $this->postJson('/api/tables', ['label' => 'M1', 'seats' => 2], authAs(['token' => 'mgr-2']))->assertCreated();
});

it('audits menu, category and table changes with before/after values', function () {
    $owner = makeOwner();
    $itemId = $this->postJson('/api/menu-items', ['name' => 'Tea', 'price' => 3], authAs($owner))->assertCreated()->json('data.id');
    $this->patchJson("/api/menu-items/{$itemId}", ['price' => 4], authAs($owner))->assertOk();
    $this->deleteJson("/api/menu-items/{$itemId}", [], authAs($owner))->assertOk();
    $tableId = $this->postJson('/api/tables', ['label' => 'A1', 'seats' => 2], authAs($owner))->assertCreated()->json('data.id');
    $this->putJson("/api/tables/{$tableId}", ['label' => 'A2', 'seats' => 4], authAs($owner))->assertOk();
    $this->deleteJson("/api/tables/{$tableId}", [], authAs($owner))->assertOk();

    $actions = DB::table('audit_logs')->where('restaurant_id', $owner['id'])->pluck('action')->all();
    expect($actions)->toContain('menu_item.created', 'menu_item.updated', 'menu_item.deleted', 'restaurant_table.created', 'restaurant_table.updated', 'restaurant_table.deleted');

    $priceChange = json_decode(DB::table('audit_logs')->where('action', 'menu_item.updated')->value('metadata'), true);
    expect((float) $priceChange['before']['price'])->toBe(3.0)->and((float) $priceChange['after']['price'])->toBe(4.0);
});

it('reports a healthy database', function () {
    $this->getJson('/health')->assertOk()->assertJson(['status' => 'ok', 'database' => 'ok']);
});
