<?php

use App\Support\Accounting\AccountingExporter;
use App\Support\DemoRestaurant;
use App\Support\MenuOptions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

/** Dish extras «الإضافات» (App\Support\MenuOptions): menu, ordering, money and staff screens. */
function extrasDish(int $ownerId, float $price = 18): int
{
    return DB::table('menu_items')->insertGetId([
        'user_id' => $ownerId, 'name' => 'شاورما', 'price' => $price, 'category' => 'رئيسي', 'is_available' => true, 'created_at' => now(), 'updated_at' => now(),
        'options' => json_encode([['id' => 'cheese1', 'name' => 'جبنة إضافية', 'price' => 3], ['id' => 'fries1', 'name' => 'بطاطا', 'price' => 4], ['id' => 'garlic1', 'name' => 'ثومية', 'price' => 2]], JSON_UNESCAPED_UNICODE),
    ]);
}

function orderWithExtras($test, array $session, array $items)
{
    return $test->postJson("/api/public/sessions/{$session['id']}/orders", ['items' => $items], customer($session));
}

/** Basic + delivery add-on, online ordering on, one zone (fee 5, minimum 30). */
function extrasOnlineRestaurant($test): array
{
    $owner = makeOwner('Online');
    DB::table('users')->where('id', $owner['id'])->update(['plan' => 'basic', 'addons' => json_encode(['delivery']), 'subscription_started_at' => now()]);
    $s = $test->putJson('/api/online-ordering/settings', ['enabled' => true, 'pickup_enabled' => true, 'delivery_enabled' => true, 'slug' => 'extras-'.$owner['id'],
        'zones' => [['name' => 'الرمال', 'fee' => 5, 'min_order' => 30]]], authAs($owner))->assertOk()->json('data');

    return $owner + ['slug' => $s['settings']['slug'], 'zone' => $s['zones'][0]['id']];
}

it('saves a dish\'s extras: ids kept or assigned, repeats dropped, prices rounded', function () {
    $owner = makeOwner();
    $created = $this->postJson('/api/menu-items', ['name' => 'برجر', 'price' => 20, 'options' => [
        ['name' => '  جبنة إضافية ', 'price' => 3],
        ['id' => 'fries01', 'name' => 'بطاطا', 'price' => 4.555],
        ['id' => 'fries01', 'name' => 'مكرر', 'price' => 1],
        ['id' => 'Not An Id!', 'name' => 'ثومية', 'price' => 0],
    ]], authAs($owner))->assertCreated()->json('data');

    $options = $created['options'];
    expect($options)->toHaveCount(3)
        ->and($options[0]['id'])->toMatch('/^[a-z0-9]{8}$/')
        ->and($options[0]['name'])->toBe('جبنة إضافية')
        ->and($options[1])->toBe(['id' => 'fries01', 'name' => 'بطاطا', 'price' => 4.56])
        ->and($options[2]['id'])->toMatch('/^[a-z0-9]{8}$/')->not->toBe($options[0]['id'])
        ->and((float) $options[2]['price'])->toBe(0.0);
    expect($this->getJson('/api/menu-items', authAs($owner))->json('data.0.options'))->toBe($options);

    // Editing keeps the ids it is sent; leaving options out keeps them; [] clears them.
    $id = $created['id'];
    $kept = $this->putJson("/api/menu-items/{$id}", ['options' => [['id' => 'fries01', 'name' => 'بطاطا', 'price' => 5]]], authAs($owner))->assertOk()->json('data.options');
    expect($kept)->toEqual([['id' => 'fries01', 'name' => 'بطاطا', 'price' => 5]]);
    expect($this->putJson("/api/menu-items/{$id}", ['price' => 22], authAs($owner))->json('data.options'))->toBe($kept);
    expect($this->putJson("/api/menu-items/{$id}", ['options' => []], authAs($owner))->json('data.options'))->toBe([])
        ->and(DB::table('menu_items')->where('id', $id)->value('options'))->toBeNull();

    // A dish without extras still answers with a list.
    expect($this->postJson('/api/menu-items', ['name' => 'عصير', 'price' => 5], authAs($owner))->json('data.options'))->toBe([]);
});

it('validates each extra at options.N.name / options.N.price', function () {
    $owner = makeOwner();
    $save = fn (array $options) => $this->postJson('/api/menu-items', ['name' => 'برجر', 'price' => 20, 'options' => $options], authAs($owner));

    $save([['name' => '', 'price' => 3]])->assertStatus(422)->assertJsonValidationErrors('options.0.name');
    $save([['name' => 'جبنة', 'price' => 3], ['name' => str_repeat('م', 61), 'price' => 3]])->assertStatus(422)->assertJsonValidationErrors('options.1.name');
    $save([['name' => 'جبنة', 'price' => -1]])->assertStatus(422)->assertJsonValidationErrors('options.0.price');
    $save([['name' => 'جبنة', 'price' => 10000]])->assertStatus(422)->assertJsonValidationErrors('options.0.price');
    $save([['name' => 'جبنة']])->assertStatus(422)->assertJsonValidationErrors('options.0.price');
    $save(array_fill(0, 21, ['name' => 'جبنة', 'price' => 1]))->assertStatus(422)->assertJsonValidationErrors('options');
    expect(DB::table('menu_items')->count())->toBe(0);
});

it('shows the extras on the table menu and the online ordering menu', function () {
    $owner = makeOwner();
    $table = makeTable($owner['id']);
    extrasDish($owner['id']);
    makeItem($owner['id']);

    $items = collect($this->getJson("/api/public/tables/{$table->table_code}/menu")->assertOk()->json('data.items'));
    expect($items->firstWhere('name', 'شاورما')['options'])->toEqual([
        ['id' => 'cheese1', 'name' => 'جبنة إضافية', 'price' => 3], ['id' => 'fries1', 'name' => 'بطاطا', 'price' => 4], ['id' => 'garlic1', 'name' => 'ثومية', 'price' => 2],
    ])->and($items->where('name', '!=', 'شاورما')->first()['options'])->toBe([]);

    $r = extrasOnlineRestaurant($this);
    extrasDish($r['id']);
    expect($this->getJson("/api/public/restaurants/{$r['slug']}")->assertOk()->json('data.items.0.options.1'))->toEqual(['id' => 'fries1', 'name' => 'بطاطا', 'price' => 4]);
});

it('prices a dine-in order from the current extras and keeps a snapshot of them', function () {
    $owner = makeOwner();
    $dish = extrasDish($owner['id']);
    $session = openSession($this, makeTable($owner['id']));

    $order = orderWithExtras($this, $session, [
        ['menuItemId' => $dish, 'quantity' => 2, 'options' => ['fries1', 'cheese1'], 'price' => 1], // client price ignored
        ['menuItemId' => $dish, 'quantity' => 1],
    ])->assertCreated()->json('data');

    $snapshot = [['id' => 'cheese1', 'name' => 'جبنة إضافية', 'price' => 3], ['id' => 'fries1', 'name' => 'بطاطا', 'price' => 4]]; // the dish's order
    expect((float) $order['items'][0]['unit_price'])->toBe(25.0)
        ->and($order['items'][0]['options'])->toEqual($snapshot)
        ->and((float) $order['items'][1]['unit_price'])->toBe(18.0)
        ->and($order['items'][1]['options'])->toBe([])
        ->and($order['items'][0]['category'])->toBe('رئيسي')
        ->and($order['items'][0])->toHaveKey('image_url');

    // Later menu edits never change the order.
    $this->putJson("/api/menu-items/{$dish}", ['price' => 30, 'options' => [['id' => 'cheese1', 'name' => 'جبنة موتزاريلا', 'price' => 6]]], authAs($owner))->assertOk();
    $line = $this->getJson("/api/public/sessions/{$session['id']}/orders", customer($session))->assertOk()->json('data.0.items.0');
    expect((float) $line['unit_price'])->toBe(25.0)->and($line['options'])->toEqual($snapshot);
    expect((float) $this->getJson("/api/public/sessions/{$session['id']}/bill", customer($session))->json('data.total'))->toBe(68.0);

    // New orders use the new prices.
    $next = orderWithExtras($this, $session, [['menuItemId' => $dish, 'quantity' => 1, 'options' => ['cheese1']]])->assertCreated();
    expect((float) $next->json('data.items.0.unit_price'))->toBe(36.0);
});

it('refuses an extra the dish no longer has, with a clear message', function () {
    $owner = makeOwner();
    $dish = extrasDish($owner['id']);
    $other = makeItem($owner['id']);
    $session = openSession($this, makeTable($owner['id']));

    orderWithExtras($this, $session, [['menuItemId' => $other, 'quantity' => 1], ['menuItemId' => $dish, 'quantity' => 1, 'options' => ['cheese1', 'gone99']]])
        ->assertStatus(422)->assertJsonPath('message', MenuOptions::UNAVAILABLE)->assertJsonValidationErrors('items.1.options');
    orderWithExtras($this, $session, [['menuItemId' => $other, 'quantity' => 1, 'options' => ['cheese1']]])->assertStatus(422); // another dish's extra
    orderWithExtras($this, $session, [['menuItemId' => $dish, 'quantity' => 1, 'options' => 'cheese1']])->assertStatus(422)->assertJsonValidationErrors('items.0.options');
    expect(DB::table('orders')->count())->toBe(0);
});

it('charges the extras in a pay-first payment', function () {
    $owner = makeOwner();
    DB::table('users')->where('id', $owner['id'])->update(['payment_timing' => 'before']);
    $dish = extrasDish($owner['id']);
    $session = openSession($this, makeTable($owner['id']));
    $pay = fn (array $items) => $this->postJson("/api/public/sessions/{$session['id']}/payment", ['items' => json_encode($items), 'method' => 'cash', 'payer_name' => 'سارة', 'payer_phone' => '0599123456'], customer($session));

    $pay([['menuItemId' => $dish, 'quantity' => 1, 'options' => ['gone99']]])->assertStatus(422)->assertJsonPath('message', MenuOptions::UNAVAILABLE);
    expect(DB::table('orders')->count())->toBe(0)->and(DB::table('payments')->count())->toBe(0);

    $paid = $pay([['menuItemId' => $dish, 'quantity' => 2, 'options' => ['garlic1']]])->assertCreated()->json('data');
    expect((float) $paid['payment']['amount'])->toBe(40.0)
        ->and(MenuOptions::decode(DB::table('order_items')->where('order_id', $paid['order']['id'])->value('options')))->toBe([['id' => 'garlic1', 'name' => 'ثومية', 'price' => 2.0]]);
});

it('counts the extras in an online order\'s subtotal and minimum order', function () {
    $r = extrasOnlineRestaurant($this);
    $cashier = makeStaff($r['id'], 'cashier');
    $dish = extrasDish($r['id'], 12);
    $place = fn (array $items) => $this->postJson("/api/public/restaurants/{$r['slug']}/orders", [
        'type' => 'delivery', 'zone_id' => $r['zone'], 'address' => 'شارع عمر المختار', 'name' => 'سارة', 'phone' => '0599123456', 'payment_method' => 'cash', 'items' => $items,
    ]);

    $place([['menuItemId' => $dish, 'quantity' => 2]])->assertStatus(422)->assertJsonPath('code', 'BELOW_MIN_ORDER'); // 24 < 30
    $place([['menuItemId' => $dish, 'quantity' => 2, 'options' => ['gone99']]])->assertStatus(422)->assertJsonPath('message', MenuOptions::UNAVAILABLE);

    $o = $place([['menuItemId' => $dish, 'quantity' => 2, 'options' => ['fries1']]])->assertCreated()->json('data'); // 2 × (12 + 4)
    expect((float) $o['subtotal'])->toBe(32.0)->and((float) $o['total'])->toBe(37.0)
        ->and($o['items'][0]['options'])->toEqual([['id' => 'fries1', 'name' => 'بطاطا', 'price' => 4]]);
    expect($this->getJson('/api/outside-orders?status=awaiting', authAs($cashier))->json('data.0.items.0.options.0.name'))->toBe('بطاطا');
});

it('shows the extras to the kitchen, on bills, in the export, and keeps them when an item is reassigned', function () {
    $owner = makeOwner();
    $kitchen = makeStaff($owner['id'], 'kitchen');
    $cashier = makeStaff($owner['id'], 'cashier');
    $waiter = makeStaff($owner['id'], 'waiter');
    $dish = extrasDish($owner['id']);
    $from = openSession($this, makeTable($owner['id'], 'T1'));
    $to = openSession($this, makeTable($owner['id'], 'T2'));
    $orderId = orderWithExtras($this, $from, [['menuItemId' => $dish, 'quantity' => 1, 'options' => ['cheese1', 'fries1']]])->json('data.id');
    $names = fn (array $options) => array_column($options, 'name');

    $k = collect($this->getJson('/api/kitchen/orders', authAs($kitchen))->assertOk()->json('data'))->firstWhere('id', $orderId);
    expect($names($k['items'][0]['options']))->toBe(['جبنة إضافية', 'بطاطا']);
    expect($names($this->getJson("/api/sessions/{$from['id']}/bill", authAs($cashier))->json('data.items.0.options')))->toBe(['جبنة إضافية', 'بطاطا']);
    expect($names($this->getJson("/api/public/sessions/{$from['id']}/bill", customer($from))->json('data.items.0.options')))->toBe(['جبنة إضافية', 'بطاطا']);
    expect($names($this->getJson("/api/owner/orders/{$orderId}", authAs($owner))->json('data.items.0.options')))->toBe(['جبنة إضافية', 'بطاطا']);

    $rows = iterator_to_array((new AccountingExporter($owner['id'], [], ['from' => now()->subDay(), 'to' => now()->addDay(), 'invoice_status' => 'all']))->rows('invoices'), false);
    expect($rows[0]['product_name'])->toBe('شاورما (+ جبنة إضافية، بطاطا)')->and($rows[0]['total'])->toBe(25.0);

    $itemId = DB::table('order_items')->where('order_id', $orderId)->value('id');
    expect($names($this->postJson("/api/order-items/{$itemId}/cancel", ['reason' => 'Wrong table'], authAs($waiter))->assertOk()->json('data.options')))->toBe(['جبنة إضافية', 'بطاطا']);
    $moved = $this->postJson("/api/order-items/{$itemId}/reassign", ['target_session_id' => $to['id']], authAs($waiter))->assertCreated()->json('data');
    expect($moved['reassigned']['options'])->toBe($moved['original']['options'])
        ->and((float) $moved['reassigned']['unit_price'])->toBe(25.0)
        ->and((float) $this->getJson("/api/sessions/{$to['id']}/bill", authAs($cashier))->json('data.total'))->toBe(25.0);
});

it('gives the demo restaurant dishes with extras, and orders that use them', function () {
    $owner = DemoRestaurant::fresh('ar');
    $menu = DB::table('menu_items')->where('user_id', $owner->id)->get();
    expect($menu->filter(fn ($m) => MenuOptions::decode($m->options))->count())->toBeGreaterThanOrEqual(5);

    $kitchen = $this->postJson('/api/demo/session', ['role' => 'kitchen', 'lang' => 'ar'])->assertOk()->json('data.token');
    $lines = collect($this->getJson('/api/kitchen/orders', ['Authorization' => 'Bearer '.$kitchen, 'Accept' => 'application/json'])->assertOk()->json('data'))->flatMap(fn ($o) => $o['items']);
    $withExtras = $lines->first(fn ($l) => $l['options'] !== []);
    $dish = $menu->firstWhere('name', $withExtras['name']);
    expect((float) $withExtras['unit_price'])->toBe((float) $dish->price + MenuOptions::sum($withExtras['options']));
});
