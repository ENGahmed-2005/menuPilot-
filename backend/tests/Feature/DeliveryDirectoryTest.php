<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function directoryRestaurant(string $name = 'Delivery'): array
{
    $owner = makeOwner($name);
    DB::table('users')->where('id', $owner['id'])->update(['addons' => json_encode(['delivery'])]);
    $slug = 'delivery-'.$owner['id'];
    DB::table('online_ordering_settings')->insert([
        'user_id' => $owner['id'], 'slug' => $slug, 'enabled' => true, 'delivery_enabled' => true,
        'created_at' => now(), 'updated_at' => now(),
    ]);
    $zone = DB::table('delivery_zones')->insertGetId([
        'user_id' => $owner['id'], 'name' => 'الرمال', 'fee' => 5, 'min_order' => 30,
        'created_at' => now(), 'updated_at' => now(),
    ]);

    return $owner + ['slug' => $slug, 'zone' => $zone];
}

it('lists delivery restaurants publicly with active zones and no account secrets', function () {
    $restaurant = directoryRestaurant();
    DB::table('restaurant_settings')->insert(['user_id' => $restaurant['id'], 'logo_url' => '/brand/mark.png']);
    DB::table('delivery_zones')->insert(['user_id' => $restaurant['id'], 'name' => 'Hidden', 'active' => false]);

    $response = $this->getJson('/api/public/restaurants')->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', $restaurant['slug'])
        ->assertJsonPath('data.0.open', true)
        ->assertJsonPath('data.0.logo_url', '/brand/mark.png')
        ->assertJsonCount(1, 'data.0.zones')
        ->assertJsonPath('data.0.zones.0.name', 'الرمال')
        ->assertJsonPath('data.0.zones.0.fee', 5)
        ->assertJsonPath('data.0.zones.0.min_order', 30);

    expect(array_keys($response->json('data.0')))->toBe([
        'slug', 'name', 'description', 'address', 'logo_url', 'open', 'paused', 'hours', 'prep_minutes', 'zones',
    ]);
});

it('omits restaurants that cannot offer delivery', function (string $condition) {
    $restaurant = directoryRestaurant();
    match ($condition) {
        'disabled' => DB::table('online_ordering_settings')->where('user_id', $restaurant['id'])->update(['enabled' => false]),
        'pickup only' => DB::table('online_ordering_settings')->where('user_id', $restaurant['id'])->update(['delivery_enabled' => false]),
        'inactive' => DB::table('users')->where('id', $restaurant['id'])->update(['is_active' => false]),
        'demo' => DB::table('users')->where('id', $restaurant['id'])->update(['is_demo' => true]),
        'no entitlement' => DB::table('users')->where('id', $restaurant['id'])->update(['addons' => '[]']),
        'revoked' => DB::table('users')->where('id', $restaurant['id'])->update(['feature_overrides' => json_encode(['revoke' => ['online_orders']])]),
        'expired' => DB::table('users')->where('id', $restaurant['id'])->update(['subscription_ends_at' => now()->subDays(10)]),
        'cancelled' => DB::table('users')->where('id', $restaurant['id'])->update(['subscription_cancelled_at' => now()->subDay()]),
        'no active zones' => DB::table('delivery_zones')->where('user_id', $restaurant['id'])->update(['active' => false]),
    };

    $this->getJson('/api/public/restaurants')->assertOk()->assertExactJson(['data' => []]);
})->with(['disabled', 'pickup only', 'inactive', 'demo', 'no entitlement', 'revoked', 'expired', 'cancelled', 'no active zones']);

it('keeps paused and closed restaurants visible after open restaurants', function () {
    $this->travelTo(now()->setTime(12, 0));
    $paused = directoryRestaurant('A Paused');
    $closed = directoryRestaurant('B Closed');
    $open = directoryRestaurant('Z Open');
    DB::table('online_ordering_settings')->where('user_id', $paused['id'])->update(['paused' => true]);
    DB::table('online_ordering_settings')->where('user_id', $closed['id'])->update(['opens_at' => '18:00', 'closes_at' => '02:00']);

    $this->getJson('/api/public/restaurants')->assertOk()->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.slug', $open['slug'])->assertJsonPath('data.0.open', true)
        ->assertJsonPath('data.1.slug', $paused['slug'])->assertJsonPath('data.1.paused', true)->assertJsonPath('data.1.open', false)
        ->assertJsonPath('data.2.slug', $closed['slug'])->assertJsonPath('data.2.open', false)
        ->assertJsonPath('data.2.hours', ['opens_at' => '18:00', 'closes_at' => '02:00']);

    $this->travelTo(now()->setTime(1, 0));
    $this->getJson('/api/public/restaurants')->assertJsonPath('data.0.slug', $closed['slug'])->assertJsonPath('data.0.open', true);
});

it('accepts a delivery order from a listed restaurant using its zone and server prices', function () {
    $restaurant = directoryRestaurant();
    $item = makeItem($restaurant['id'], 20);
    $entry = $this->getJson('/api/public/restaurants')->assertOk()->json('data.0');

    $order = $this->postJson("/api/public/restaurants/{$entry['slug']}/orders", [
        'type' => 'delivery', 'name' => 'سارة', 'phone' => '0599123456', 'address' => 'شارع عمر المختار',
        'zone_id' => $entry['zones'][0]['id'], 'payment_method' => 'cash',
        'items' => [['menuItemId' => $item, 'quantity' => 2, 'price' => 1]],
    ])->assertCreated()->assertJsonPath('data.channel', 'delivery')->assertJsonPath('data.total', 45)->json('data');

    $this->assertDatabaseHas('orders', ['id' => $order['id'], 'user_id' => $restaurant['id'], 'channel' => 'delivery', 'delivery_fee' => 5]);
    $this->assertDatabaseHas('order_items', ['order_id' => $order['id'], 'menu_item_id' => $item, 'quantity' => 2, 'unit_price' => 20]);
    $this->getJson("/api/public/outside-orders/{$order['id']}?token={$order['token']}")->assertOk()->assertJsonPath('data.fulfillment_status', 'awaiting_acceptance');
});

it('shows unavailable dishes on both menus but rejects their orders with 422 until reenabled', function () {
    $restaurant = directoryRestaurant();
    $item = makeItem($restaurant['id'], 20);
    $deleted = makeItem($restaurant['id']);
    DB::table('menu_items')->where('id', $deleted)->update(['deleted_at' => now()]);
    $table = makeTable($restaurant['id']);
    $session = openSession($this, $table);
    $payload = ['type' => 'pickup', 'name' => 'سارة', 'phone' => '0599123456', 'payment_method' => 'cash', 'items' => [['menuItemId' => $item, 'quantity' => 1]]];

    $this->putJson("/api/menu-items/$item", ['is_available' => false], authAs($restaurant))->assertOk()->assertJsonPath('data.is_available', false);
    $this->assertDatabaseHas('menu_items', ['id' => $item, 'is_available' => false, 'deleted_at' => null]);
    foreach (["/api/public/restaurants/{$restaurant['slug']}", "/api/public/tables/{$table->table_code}/menu"] as $url) {
        $this->getJson($url)->assertOk()->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.id', $item)->assertJsonPath('data.items.0.is_available', false);
    }
    $this->postJson("/api/public/restaurants/{$restaurant['slug']}/orders", $payload)->assertUnprocessable()->assertJsonPath('code', 'ITEM_UNAVAILABLE');
    $this->postJson("/api/public/sessions/{$session['id']}/orders", ['items' => $payload['items']], customer($session))->assertUnprocessable();
    $this->assertDatabaseCount('orders', 0);

    $this->putJson("/api/menu-items/$item", ['is_available' => true], authAs($restaurant))->assertOk()->assertJsonPath('data.is_available', true);
    $this->postJson("/api/public/restaurants/{$restaurant['slug']}/orders", $payload)->assertCreated();
    $this->assertDatabaseHas('order_items', ['menu_item_id' => $item, 'quantity' => 1]);
});

it('rejects new outside orders with 409 when a listed restaurant is deactivated', function () {
    $restaurant = directoryRestaurant();
    $item = makeItem($restaurant['id']);
    DB::table('users')->where('id', $restaurant['id'])->update(['is_active' => false]);

    $this->postJson("/api/public/restaurants/{$restaurant['slug']}/orders", [
        'type' => 'pickup', 'name' => 'سارة', 'phone' => '0599123456', 'payment_method' => 'cash',
        'items' => [['menuItemId' => $item, 'quantity' => 1]],
    ])->assertConflict()->assertJsonPath('code', 'ONLINE_ORDERING_CLOSED');

    $this->assertDatabaseCount('orders', 0);
});
