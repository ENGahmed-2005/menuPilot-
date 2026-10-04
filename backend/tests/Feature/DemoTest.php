<?php

use App\Support\DemoRestaurant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

/** «Try it» demo restaurants (App\Support\DemoRestaurant). */
function demoAs($test, string $role, string $lang = 'en'): array
{
    return $test->postJson('/api/demo/session', ['role' => $role, 'lang' => $lang])->assertOk()->json('data');
}

it('opens a live restaurant for each role, in English and Arabic', function () {
    $owner = demoAs($this, 'owner');
    expect($owner['user'])->toMatchArray(['role' => 'owner', 'is_demo' => true])->and($owner['user']['subscription']['plan'])->toBe('pro');
    $api = ['Authorization' => 'Bearer '.$owner['token'], 'Accept' => 'application/json'];
    $this->getJson('/api/auth/me', $api)->assertOk()->assertJsonPath('data.restaurant_name', 'The Olive Kitchen');
    expect($this->getJson('/api/owner/finance/summary', $api)->assertOk()->json('data.revenue'))->toBeGreaterThan(0);

    foreach (['kitchen', 'cashier', 'waiter'] as $role) {
        expect(demoAs($this, $role)['user']['role'])->toBe($role);
    }
    $kitchen = demoAs($this, 'kitchen');
    $orders = $this->getJson('/api/kitchen/orders', ['Authorization' => 'Bearer '.$kitchen['token'], 'Accept' => 'application/json'])->assertOk()->json('data');
    expect(collect($orders)->pluck('status')->map(fn ($s) => strtolower($s))->unique()->values()->all())->toContain('pending', 'preparing', 'ready');

    $ar = demoAs($this, 'owner', 'ar');
    expect($ar['user']['restaurant_name'])->toBe('مطعم الزيتونة');
    $o = DemoRestaurant::owner('en');
    expect(DB::table('menu_items')->where('user_id', $o->id)->count())->toBe(9)
        ->and(DB::table('restaurant_tables')->where('user_id', $o->id)->count())->toBe(8)
        ->and(DB::table('restaurant_employees')->where('user_id', $o->id)->count())->toBe(4)
        ->and(DB::table('orders')->where('user_id', $o->id)->where('fulfillment_status', 'awaiting_acceptance')->count())->toBe(2);
});

it('lets several visitors use a role at once, and rebuilds the next day', function () {
    $first = demoAs($this, 'owner');
    $second = demoAs($this, 'owner');
    expect($second['token'])->toBe($first['token']); // the first visitor isn't logged out
    $this->getJson('/api/auth/me', ['Authorization' => 'Bearer '.$first['token'], 'Accept' => 'application/json'])->assertOk();
    $oldOwner = DemoRestaurant::owner('en')->id;

    $this->travel(25)->hours();
    $next = demoAs($this, 'owner');
    expect($next['token'])->not->toBe($first['token'])
        ->and(DemoRestaurant::owner('en')->id)->not->toBe($oldOwner)
        ->and(DB::table('users')->where('email', 'like', 'demo-en-%')->count())->toBe(4)  // owner + 3 staff, no leftovers
        ->and(DB::table('menu_items')->where('user_id', $oldOwner)->count())->toBe(0);
    $this->getJson('/api/auth/me', ['Authorization' => 'Bearer '.$first['token'], 'Accept' => 'application/json'])->assertUnauthorized();
});

it('keeps accounts, plans and payments closed in the demo, the rest open', function () {
    $api = ['Authorization' => 'Bearer '.demoAs($this, 'owner')['token'], 'Accept' => 'application/json'];
    $this->postJson('/api/staff', ['name' => 'X', 'email' => 'x@x.test', 'role' => 'cashier'], $api)->assertForbidden()->assertJsonPath('code', 'DEMO_READ_ONLY');
    $this->patchJson('/api/me/plan', ['plan' => 'basic'], $api)->assertForbidden()->assertJsonPath('code', 'DEMO_READ_ONLY');
    $this->putJson('/api/online-ordering/settings', ['slug' => 'mine'], $api)->assertForbidden();
    $this->postJson('/api/owner/finance/employees', ['name' => 'Tried it', 'pay_rate' => 100], $api)->assertCreated();
    $this->postJson('/api/tables', ['label' => '99', 'seats' => 2], $api)->assertSuccessful();

    // Real restaurants are untouched by the demo rules.
    $real = makeOwner('Real');
    $this->postJson('/api/staff', ['name' => 'Y', 'email' => 'y@y.test', 'role' => 'cashier'], authAs($real))->assertSuccessful();
});

it('lets a visitor order as a guest from anywhere, and only at the demo', function () {
    $code = $this->getJson('/api/demo/guest?lang=en')->assertOk()->json('data.table_code');
    $this->getJson("/api/public/tables/{$code}/menu")->assertOk()->assertJsonPath('data.restaurant.is_demo', true);
    $session = $this->postJson("/api/public/tables/{$code}/sessions", ['name' => 'Visitor', 'phone' => '0599000000'])->assertSuccessful()->json('data');
    expect($session['id'])->toBeInt();

    $realTable = makeTable(makeOwner('Real')['id']);
    $this->postJson("/api/public/tables/{$realTable->table_code}/sessions", ['name' => 'Sara', 'phone' => '0599000000'])->assertStatus(422)->assertJsonValidationErrors('latitude');
    $this->getJson("/api/public/tables/{$realTable->table_code}/menu")->assertOk()->assertJsonPath('data.restaurant.is_demo', false);
});

it('can be switched off', function () {
    config(['demo.enabled' => false]);
    $this->postJson('/api/demo/session', ['role' => 'owner'])->assertNotFound();
    $this->postJson('/api/demo/session', ['role' => 'admin'])->assertNotFound();
    config(['demo.enabled' => true]);
    $this->postJson('/api/demo/session', ['role' => 'admin'])->assertStatus(422);
});
