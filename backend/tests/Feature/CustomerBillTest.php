<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('lets the customer see their own itemised bill, and the cashier sees the request', function () {
    $owner = makeOwner();
    $cashier = makeStaff($owner['id'], 'cashier');
    $s = openSession($this, makeTable($owner['id'], '5'));
    $burger = makeItem($owner['id'], 18);
    $juice = makeItem($owner['id'], 6);
    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => $burger, 'quantity' => 2, 'note' => 'well done']]], customer($s))->assertCreated();
    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => $juice, 'quantity' => 1]]], customer($s))->assertCreated();
    $this->postJson("/api/public/sessions/{$s['id']}/bill-request", [], customer($s))->assertOk();

    $bill = $this->getJson("/api/public/sessions/{$s['id']}/bill", customer($s))->assertOk()->json('data');
    expect($bill['items'])->toHaveCount(2)
        ->and((float) $bill['total'])->toBe(42.0)
        ->and((float) $bill['outstanding'])->toBe(42.0)
        ->and($bill['session']['table_label'])->toBe('5')
        ->and($bill['session']['bill_requested'])->toBeTrue()
        ->and($bill['lifecycle'])->toBe('bill_requested')
        ->and($bill['items'][0])->not->toHaveKey('payer_name');

    // The cashier's screen shows the bill request.
    $session = $this->getJson('/api/sessions', authAs($cashier))->json('data.0');
    expect($session['billRequested'])->toBeTrue()->and($session['lifecycle'])->toBe('bill_requested');

    // After payment the customer's bill updates.
    $this->postJson("/api/sessions/{$s['id']}/payment", ['method' => 'cash'], authAs($cashier))->assertCreated();
    $after = $this->getJson("/api/public/sessions/{$s['id']}/bill", customer($s))->json('data');
    expect((float) $after['outstanding'])->toBe(0.0)->and($after['session']['closed_at'])->not->toBeNull();
});

it('keeps the bill private to the session', function () {
    $owner = makeOwner();
    $s = openSession($this, makeTable($owner['id']));
    $this->getJson("/api/public/sessions/{$s['id']}/bill")->assertForbidden();
    $this->getJson("/api/public/sessions/{$s['id']}/bill", ['X-Session-Token' => 'guess'])->assertForbidden();
});
