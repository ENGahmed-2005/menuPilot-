<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/** Premium restaurant with online ordering on (pickup + delivery, one zone). */
function onlineRestaurant($test, string $plan = 'premium'): array
{
    $owner = makeOwner('Zaytoona');
    DB::table('users')->where('id', $owner['id'])->update(['plan' => $plan, 'subscription_started_at' => now()]);
    $item = makeItem($owner['id'], 20);
    $s = $test->putJson('/api/online-ordering/settings', ['enabled' => true, 'pickup_enabled' => true, 'delivery_enabled' => true, 'slug' => 'zaytoona-'.$owner['id'],
        'zones' => [['name' => 'الرمال', 'fee' => 5, 'min_order' => 30]]], authAs($owner))->assertOk()->json('data');

    return $owner + ['item' => $item, 'slug' => $s['settings']['slug'], 'zone' => $s['zones'][0]['id']];
}

function placeOrder($test, array $r, array $extra = [])
{
    return $test->postJson("/api/public/restaurants/{$r['slug']}/orders", array_merge([
        'type' => 'pickup', 'name' => 'سارة', 'phone' => '0599 123 456', 'payment_method' => 'cash',
        'items' => [['menuItemId' => $r['item'], 'quantity' => 2, 'price' => 1]], // client price ignored
    ], $extra));
}

it('runs a pickup order: awaiting → accepted → kitchen → completed (cash)', function () {
    $r = onlineRestaurant($this);
    $kitchen = makeStaff($r['id'], 'kitchen');
    $cashier = makeStaff($r['id'], 'cashier');

    $this->getJson("/api/public/restaurants/{$r['slug']}")->assertOk()->assertJsonPath('data.open', true)->assertJsonPath('data.items.0.id', $r['item']);
    $o = placeOrder($this, $r)->assertCreated()->json('data');
    expect($o['fulfillment_status'])->toBe('awaiting_acceptance')->and((float) $o['total'])->toBe(40.0)->and($o['tracking_url'])->toContain("/o/{$o['id']}?token=");

    // Not in the kitchen until accepted.
    expect(collect($this->getJson('/api/kitchen/orders', authAs($kitchen))->json('data'))->pluck('id'))->not->toContain($o['id']);
    expect($this->getJson('/api/outside-orders?status=awaiting', authAs($cashier))->json('data.0.customer.phone'))->toBe('0599123456');

    $this->postJson("/api/outside-orders/{$o['id']}/accept", ['prep_minutes' => 15], authAs($cashier))->assertOk()->assertJsonPath('data.fulfillment_status', 'accepted');
    $k = collect($this->getJson('/api/kitchen/orders', authAs($kitchen))->json('data'))->firstWhere('id', $o['id']);
    expect($k['tableLabel'] ?? $k['table_label'])->toBe('استلام')->and($k['customerName'] ?? $k['customer_name'])->toBe('سارة');
    foreach (['preparing', 'ready'] as $st) {
        $this->patchJson("/api/kitchen/orders/{$o['id']}/status", ['status' => $st], authAs($kitchen))->assertOk();
    }
    $this->postJson("/api/outside-orders/{$o['id']}/accept", [], authAs($cashier))->assertStatus(409); // no double handling
    $this->postJson("/api/outside-orders/{$o['id']}/complete", [], authAs($cashier))->assertOk()->assertJsonPath('data.payment_status', 'paid');

    $track = $this->getJson("/api/public/outside-orders/{$o['id']}?token={$o['token']}")->assertOk()->json('data');
    expect($track['fulfillment_status'])->toBe('completed');
    $this->getJson("/api/public/outside-orders/{$o['id']}?token=wrong")->assertForbidden();
    expect(DB::table('audit_logs')->where('action', 'like', 'outside_order.%')->count())->toBe(2);
});

it('prices delivery with the zone fee, enforces the minimum and dispatches', function () {
    $r = onlineRestaurant($this);
    $cashier = makeStaff($r['id'], 'cashier');
    placeOrder($this, $r, ['type' => 'delivery', 'zone_id' => $r['zone'], 'address' => 'شارع عمر المختار', 'items' => [['menuItemId' => $r['item'], 'quantity' => 1]]])
        ->assertStatus(422)->assertJsonPath('code', 'BELOW_MIN_ORDER');
    placeOrder($this, $r, ['type' => 'delivery', 'zone_id' => $r['zone']])->assertStatus(422); // address required

    $o = placeOrder($this, $r, ['type' => 'delivery', 'zone_id' => $r['zone'], 'address' => 'شارع عمر المختار'])->assertCreated()->json('data');
    expect((float) $o['delivery_fee'])->toBe(5.0)->and((float) $o['total'])->toBe(45.0);
    $this->postJson("/api/outside-orders/{$o['id']}/dispatch", [], authAs($cashier))->assertStatus(409); // not accepted yet
    $this->postJson("/api/outside-orders/{$o['id']}/accept", [], authAs($cashier))->assertOk();
    $this->postJson("/api/outside-orders/{$o['id']}/dispatch", [], authAs($cashier))->assertOk()->assertJsonPath('data.fulfillment_status', 'out_for_delivery');
    $this->postJson("/api/outside-orders/{$o['id']}/complete", [], authAs($cashier))->assertOk()->assertJsonPath('data.fulfillment_status', 'completed');
});

it('requires a receipt for transfers and verification before handover', function () {
    $r = onlineRestaurant($this);
    $cashier = makeStaff($r['id'], 'cashier');
    placeOrder($this, $r, ['payment_method' => 'transfer'])->assertStatus(422);
    $o = placeOrder($this, $r, ['payment_method' => 'transfer', 'proof' => PNG])->assertCreated()->json('data');
    expect($o['payment_status'])->toBe('pending_verification');

    $this->postJson("/api/outside-orders/{$o['id']}/accept", [], authAs($cashier))->assertOk();
    $this->postJson("/api/outside-orders/{$o['id']}/complete", [], authAs($cashier))->assertStatus(409)->assertJsonPath('code', 'PAYMENT_NOT_VERIFIED');
    $this->postJson("/api/outside-orders/{$o['id']}/verify-payment", [], authAs($cashier))->assertOk()->assertJsonPath('data.payment_status', 'paid');
    $this->postJson("/api/outside-orders/{$o['id']}/complete", [], authAs($cashier))->assertOk();
});

it('lets the restaurant reject with a reason the customer sees', function () {
    $r = onlineRestaurant($this);
    $o = placeOrder($this, $r)->json('data');
    $this->postJson("/api/outside-orders/{$o['id']}/reject", ['reason' => 'نفد الصنف'], authAs($r))->assertOk();
    $track = $this->getJson("/api/public/outside-orders/{$o['id']}?token={$o['token']}")->json('data');
    expect($track['fulfillment_status'])->toBe('rejected')->and($track['rejection_reason'])->toBe('نفد الصنف');
});

it('only accepts orders when enabled, open, not paused and on Premium', function () {
    $r = onlineRestaurant($this);
    $this->putJson('/api/online-ordering/settings', ['paused' => true], authAs($r))->assertOk();
    placeOrder($this, $r)->assertStatus(409)->assertJsonPath('code', 'ONLINE_ORDERING_CLOSED');
    $this->putJson('/api/online-ordering/settings', ['paused' => false], authAs($r))->assertOk();
    placeOrder($this, $r)->assertCreated();

    $pro = onlineRestaurant($this, 'pro');
    placeOrder($this, $pro)->assertStatus(409);
    expect($this->getJson('/api/online-ordering/settings', authAs($pro))->json('data.plan_allows'))->toBeFalse();
});

it('isolates restaurants and limits pending orders per phone', function () {
    $a = onlineRestaurant($this);
    $b = onlineRestaurant($this);
    $o = placeOrder($this, $a)->json('data');

    $this->postJson("/api/outside-orders/{$o['id']}/accept", [], authAs($b))->assertNotFound();
    expect($this->getJson('/api/outside-orders?status=awaiting', authAs($b))->json('data'))->toBe([]);

    placeOrder($this, $a)->assertCreated();
    placeOrder($this, $a)->assertCreated();
    placeOrder($this, $a)->assertStatus(429)->assertJsonPath('code', 'TOO_MANY_PENDING');
});

it('stores the restaurant WhatsApp in international format and shares it with tracking and bills', function () {
    $r = onlineRestaurant($this);
    $this->putJson('/api/online-ordering/settings', ['whatsapp' => '0599123456'], authAs($r))->assertStatus(422); // country code required
    $this->putJson('/api/online-ordering/settings', ['whatsapp' => '+970599123456'], authAs($r))->assertOk()->assertJsonPath('data.whatsapp', '+970599123456');

    expect($this->getJson("/api/public/restaurants/{$r['slug']}")->json('data.restaurant.whatsapp'))->toBe('+970599123456');
    $o = placeOrder($this, $r)->json('data');
    $this->postJson("/api/outside-orders/{$o['id']}/accept", ['prep_minutes' => 25], authAs($r))->assertOk();
    $t = $this->getJson("/api/public/outside-orders/{$o['id']}?token={$o['token']}")->json('data');
    expect($t['restaurant']['whatsapp'])->toBe('+970599123456')->and($t['eta_at'])->not->toBeNull();

    // Dine-in bill exposes it too.
    $s = openSession($this, makeTable($r['id']));
    expect($this->getJson("/api/public/sessions/{$s['id']}/bill", customer($s))->json('data.restaurant_whatsapp'))->toBe('+970599123456');
});

it('stores the customer GPS location for delivery and shows it to staff only', function () {
    $r = onlineRestaurant($this);
    placeOrder($this, $r, ['type' => 'delivery', 'zone_id' => $r['zone'], 'address' => 'شارع الشهداء', 'latitude' => 95, 'longitude' => 34.4])->assertStatus(422);
    $o = placeOrder($this, $r, ['type' => 'delivery', 'zone_id' => $r['zone'], 'address' => 'شارع الشهداء قرب المسجد', 'latitude' => 31.5203, 'longitude' => 34.4521, 'location_accuracy' => 18])->assertCreated()->json('data');
    $pickup = placeOrder($this, $r, ['phone' => '0599000999', 'latitude' => 31.5, 'longitude' => 34.4])->assertCreated()->json('data');

    $this->postJson("/api/outside-orders/{$o['id']}/accept", [], authAs($r))->assertOk();
    $board = $this->getJson('/api/outside-orders?status=delivery', authAs($r))->json('data');
    expect($board)->toHaveCount(1)
        ->and($board[0]['customer']['location'])->toBe(['lat' => 31.5203, 'lng' => 34.4521, 'accuracy' => 18])
        ->and($board[0]['customer']['address'])->toBe('شارع الشهداء قرب المسجد');

    // Not exposed on the public tracking page; not stored for pickup orders.
    expect($this->getJson("/api/public/outside-orders/{$o['id']}?token={$o['token']}")->json('data.customer'))->not->toHaveKey('location');
    expect(DB::table('outside_order_contacts')->where('order_id', $pickup['id'])->value('latitude'))->toBeNull();
});

it('lets a delivery driver see and complete delivery orders only', function () {
    $r = onlineRestaurant($this);
    $driver = makeStaff($r['id'], 'delivery');
    expect($this->getJson('/api/auth/me', authAs($driver))->json('user.permissions') ?? $this->getJson('/api/auth/me', authAs($driver))->json('data.permissions'))->toContain('deliver_orders');

    $d = placeOrder($this, $r, ['type' => 'delivery', 'zone_id' => $r['zone'], 'address' => 'الرمال'])->json('data');
    $p = placeOrder($this, $r, ['phone' => '0599000555'])->json('data');
    $this->postJson("/api/outside-orders/{$d['id']}/accept", [], authAs($driver))->assertForbidden(); // cannot accept
    $this->postJson("/api/outside-orders/{$d['id']}/accept", [], authAs($r))->assertOk();
    $this->postJson("/api/outside-orders/{$p['id']}/accept", [], authAs($r))->assertOk();
    $this->postJson("/api/outside-orders/{$d['id']}/assign", ['driver_id' => $driver['id']], authAs($r))->assertOk(); // the owner can assign too

    // Board shows the driver's delivery orders only, whatever filter is requested.
    $ids = collect($this->getJson('/api/outside-orders?status=active', authAs($driver))->json('data'))->pluck('id');
    expect($ids->all())->toBe([$d['id']]);
    $this->postJson("/api/outside-orders/{$p['id']}/complete", [], authAs($driver))->assertForbidden(); // pickup is not theirs
    $this->postJson("/api/outside-orders/{$d['id']}/dispatch", [], authAs($driver))->assertOk();
    $this->postJson("/api/outside-orders/{$d['id']}/complete", [], authAs($driver))->assertOk()->assertJsonPath('data.fulfillment_status', 'completed');
    $this->getJson('/api/kitchen/orders', authAs($driver))->assertForbidden(); // no general order access
});

it('applies permission changes immediately without signing the employee out', function () {
    $owner = makeOwner();
    $waiter = makeStaff($owner['id'], 'waiter');
    $staffId = DB::table('staff')->where('account_user_id', $waiter['id'])->value('id');
    $this->getJson('/api/tables', authAs($waiter))->assertOk();

    $this->putJson("/api/staff/{$staffId}", ['permissions' => ['view_orders', 'view_menu']], authAs($owner))->assertOk();
    $me = $this->getJson('/api/auth/me', authAs($waiter))->assertOk(); // still signed in
    expect(json_encode($me->json()))->not->toContain('view_tables');
    $this->getJson('/api/tables', authAs($waiter))->assertForbidden(); // revoked right away

    $this->putJson("/api/staff/{$staffId}", ['role' => 'cashier'], authAs($owner))->assertOk();
    $this->getJson('/api/auth/me', authAs($waiter))->assertUnauthorized(); // role change: sign in again
});

it('lets the delivery manager assign orders to drivers who then see only their own', function () {
    $r = onlineRestaurant($this);
    $manager = makeStaff($r['id'], 'delivery_manager');
    $sami = makeStaff($r['id'], 'delivery');
    $omar = makeStaff($r['id'], 'delivery');
    $other = onlineRestaurant($this);
    $foreign = makeStaff($other['id'], 'delivery');

    $a = placeOrder($this, $r, ['type' => 'delivery', 'zone_id' => $r['zone'], 'address' => 'الرمال'])->json('data');
    $b = placeOrder($this, $r, ['type' => 'delivery', 'zone_id' => $r['zone'], 'address' => 'تل الهوى', 'phone' => '0599000444'])->json('data');
    foreach ([$a, $b] as $o) {
        $this->postJson("/api/outside-orders/{$o['id']}/accept", [], authAs($r))->assertOk();
    }

    // Manager sees every delivery order and the drivers list.
    expect(collect($this->getJson('/api/outside-orders?status=active', authAs($manager))->json('data'))->pluck('id')->sort()->values()->all())->toBe([$a['id'], $b['id']]);
    expect(collect($this->getJson('/api/outside-orders/drivers', authAs($manager))->json('data'))->pluck('id')->sort()->values()->all())->toBe(collect([$sami['id'], $omar['id']])->sort()->values()->all());
    $this->postJson("/api/outside-orders/{$a['id']}/assign", ['driver_id' => $foreign['id']], authAs($manager))->assertStatus(422); // not our driver
    $this->postJson("/api/outside-orders/{$a['id']}/assign", ['driver_id' => $sami['id']], authAs($manager))->assertOk()->assertJsonPath('data.driver.id', $sami['id']);
    $this->postJson("/api/outside-orders/{$b['id']}/assign", ['driver_id' => $omar['id']], authAs($manager))->assertOk();
    $this->postJson("/api/outside-orders/{$a['id']}/assign", ['driver_id' => $sami['id']], authAs($sami))->assertForbidden(); // drivers cannot assign

    // Each driver sees and completes only their own order.
    expect(collect($this->getJson('/api/outside-orders', authAs($sami))->json('data'))->pluck('id')->all())->toBe([$a['id']]);
    $this->postJson("/api/outside-orders/{$b['id']}/dispatch", [], authAs($sami))->assertForbidden();
    $this->postJson("/api/outside-orders/{$b['id']}/complete", [], authAs($sami))->assertForbidden();
    $this->postJson("/api/outside-orders/{$a['id']}/dispatch", [], authAs($sami))->assertOk();
    $this->postJson("/api/outside-orders/{$a['id']}/complete", [], authAs($sami))->assertOk();
});
