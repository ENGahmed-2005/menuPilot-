<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('auto-closes a session nobody ordered from after 30 minutes, without an invoice number', function () {
    $this->freezeTime();
    $owner = makeOwner();
    $cashier = makeStaff($owner['id'], 'cashier');
    $table = makeTable($owner['id'], 'T1');
    $s = openSession($this, $table);

    $this->travel(20)->minutes();
    $row = $this->getJson('/api/sessions', authAs($cashier))->json('data.0');
    expect($row)->toMatchArray(['hasOrders' => false, 'idleMinutes' => 20, 'idle' => true]); // flagged, still open

    $this->travel(11)->minutes();
    expect($this->getJson('/api/sessions', authAs($cashier))->json('data'))->toBe([]);
    expect(DB::table('dining_sessions')->where('id', $s['id'])->value('closed_at'))->not->toBeNull()
        ->and(DB::table('dining_sessions')->where('id', $s['id'])->value('invoice_number'))->toBeNull()
        ->and(DB::table('restaurant_tables')->where('id', $table->id)->value('status'))->toBe('available')
        ->and(DB::table('audit_logs')->where('action', 'session.auto_closed')->exists())->toBeTrue();

    // The next customer at the same table gets a fresh session, not the stale one.
    $next = openSession($this, $table, 'Omar');
    expect($next['id'])->not->toBe($s['id']);
});

it('never auto-closes a session with orders; it is only flagged idle', function () {
    $this->freezeTime();
    $owner = makeOwner();
    $cashier = makeStaff($owner['id'], 'cashier');
    $s = openSession($this, makeTable($owner['id']));
    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => makeItem($owner['id']), 'quantity' => 1]]], customer($s))->assertCreated();

    $this->travel(3)->hours();
    $row = $this->getJson('/api/sessions', authAs($cashier))->json('data.0');
    expect($row['id'])->toBe($s['id'])->and($row['idle'])->toBeTrue()->and($row['hasOrders'])->toBeTrue()->and($row['idleMinutes'])->toBe(180);
});

it('lets the customer leave when nothing is owed, and asks for the bill otherwise', function () {
    $owner = makeOwner();
    $table = makeTable($owner['id']);
    $empty = openSession($this, $table);
    expect($this->getJson("/api/public/sessions/{$empty['id']}", customer($empty))->json('data.can_leave'))->toBeTrue();
    $this->postJson("/api/public/sessions/{$empty['id']}/leave", [], customer($empty))->assertOk()->assertJsonPath('data.status', 'closed');
    expect(DB::table('restaurant_tables')->where('id', $table->id)->value('status'))->toBe('available');

    $s = openSession($this, $table);
    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => makeItem($owner['id'], 12), 'quantity' => 1]]], customer($s))->assertCreated();
    expect($this->getJson("/api/public/sessions/{$s['id']}", customer($s))->json('data.can_leave'))->toBeFalse();
    $this->postJson("/api/public/sessions/{$s['id']}/leave", [], customer($s))->assertStatus(409)->assertJsonPath('code', 'BILL_OUTSTANDING');
    $this->postJson("/api/public/sessions/{$s['id']}/leave")->assertForbidden(); // needs the session token
});

it('lets each restaurant choose pay-first or pay-after-eating for dine-in', function () {
    $owner = makeOwner();
    $item = makeItem($owner['id']);
    $s = openSession($this, makeTable($owner['id']));
    expect($this->getJson("/api/public/sessions/{$s['id']}", customer($s))->json('data.payment_timing'))->toBe('after');
    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => $item, 'quantity' => 1]]], customer($s))->assertCreated(); // straight to the kitchen

    // Pay first: the direct route is closed; the order must go through payment.
    DB::table('users')->where('id', $owner['id'])->update(['payment_timing' => 'before']);
    expect($this->getJson("/api/public/sessions/{$s['id']}", customer($s))->json('data.payment_timing'))->toBe('before');
    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => $item, 'quantity' => 1]]], customer($s))
        ->assertStatus(409)->assertJsonPath('code', 'PAY_FIRST_REQUIRED');

    // The owner switches it from the restaurant settings.
    $this->patchJson('/api/me/restaurant', ['restaurant_name' => 'X', 'payment_timing' => 'later'], authAs($owner))->assertStatus(422);
    $this->patchJson('/api/me/restaurant', ['restaurant_name' => 'X', 'payment_timing' => 'after'], authAs($owner))->assertOk()->assertJsonPath('data.payment_timing', 'after');
});
