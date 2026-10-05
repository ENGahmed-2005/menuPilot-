<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

/** A kitchen account with one pending order. */
function kitchenWithOrder($test): array
{
    $owner = makeOwner('Idem');
    $kitchen = makeStaff($owner['id'], 'kitchen');
    $table = makeTable($owner['id']);
    $session = openSession($test, $table);
    $test->postJson("/api/public/sessions/{$session['id']}/orders", ['items' => [['menuItemId' => makeItem($owner['id']), 'quantity' => 1]]], customer($session))->assertCreated();
    $order = DB::table('orders')->first();

    return [$kitchen, $order, $owner, $session];
}

it('replays the first answer when the same key is sent again', function () {
    [$kitchen, $order] = kitchenWithOrder($this);
    $headers = authAs($kitchen) + ['Idempotency-Key' => 'op-0001-aaaaaaaa'];

    $first = $this->patchJson("/api/kitchen/orders/{$order->id}/status", ['status' => 'preparing'], $headers)->assertOk();
    expect($first->headers->has('Idempotent-Replay'))->toBeFalse();

    // The order moved on (someone else marked it ready); a lost-answer retry must not undo that.
    DB::table('orders')->where('id', $order->id)->update(['status' => 'ready']);
    $again = $this->patchJson("/api/kitchen/orders/{$order->id}/status", ['status' => 'preparing'], $headers)->assertOk();
    expect($again->headers->get('Idempotent-Replay'))->toBe('true')
        ->and($again->json())->toBe($first->json())
        ->and(DB::table('orders')->find($order->id)->status)->toBe('ready');
});

it('treats another key, another person or no key as a new request', function () {
    [$kitchen, $order, $owner] = kitchenWithOrder($this);
    $path = "/api/kitchen/orders/{$order->id}/status";

    $this->patchJson($path, ['status' => 'preparing'], authAs($kitchen) + ['Idempotency-Key' => 'op-0002-aaaaaaaa'])->assertOk();
    // Same key, other account: runs for real (here the owner may move it on).
    $other = $this->patchJson("/api/orders/{$order->id}/status", ['status' => 'ready'], authAs($owner) + ['Idempotency-Key' => 'op-0002-aaaaaaaa'])->assertOk();
    expect($other->headers->has('Idempotent-Replay'))->toBeFalse()->and(DB::table('orders')->find($order->id)->status)->toBe('ready');
    // No key or a malformed key: never replayed.
    $this->patchJson($path, ['status' => 'served'], authAs($kitchen))->assertOk();
    $this->patchJson($path, ['status' => 'served'], authAs($kitchen) + ['Idempotency-Key' => 'x'])->assertOk();
});

it('does not keep failed answers, so a retry after fixing the cause runs', function () {
    [$kitchen, $order] = kitchenWithOrder($this);
    $headers = authAs($kitchen) + ['Idempotency-Key' => 'op-0003-aaaaaaaa'];
    // pending → served is not allowed (422): nothing is saved.
    $this->patchJson("/api/kitchen/orders/{$order->id}/status", ['status' => 'served'], $headers)->assertStatus(422);
    $retry = $this->patchJson("/api/kitchen/orders/{$order->id}/status", ['status' => 'served'], $headers)->assertStatus(422);
    expect($retry->headers->has('Idempotent-Replay'))->toBeFalse();
});

it('lets the browser send and read the idempotency headers', function () {
    $this->call('OPTIONS', '/api/kitchen/orders')->assertNoContent()->assertHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Session-Token, Idempotency-Key');
});
