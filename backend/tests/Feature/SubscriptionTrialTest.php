<?php

use App\Events\SubscriptionLifecycleEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function registerOwner($test, array $extra = []): array
{
    $res = $test->postJson('/api/auth/register', array_merge([
        'restaurant_name' => 'مطعم التجربة', 'email' => 'trial'.uniqid().'@x.test',
        'password' => 'Trial#Pass123', 'password_confirmation' => 'Trial#Pass123',
    ], $extra))->assertCreated();

    return ['token' => $res->json('data.token'), 'id' => $res->json('data.user.id'), 'user' => $res->json('data.user')];
}

function trialAdmin(): array
{
    $token = 'adm-'.uniqid();
    DB::table('users')->insert(['name' => 'Admin', 'email' => uniqid().'@adm.test', 'password' => Hash::make('x'), 'role' => 'admin', 'api_token' => hash('sha256', $token), 'created_at' => now(), 'updated_at' => now()]);

    return ['token' => $token];
}

it('registers an owner with a 14-day trial decided by the server, in one transaction', function () {
    $this->freezeTime();
    Event::fake([SubscriptionLifecycleEvent::class]);
    // Client-sent dates / status / plan are ignored.
    $owner = registerOwner($this, ['plan' => 'premium', 'trial_ends_at' => '2099-01-01', 'subscription_status' => 'ACTIVE']);

    $u = User::find($owner['id']);
    expect($u->plan)->toBe('trial')
        ->and($u->trial_started_at->toIso8601String())->toBe(now()->toIso8601String())
        ->and($u->trial_ends_at->toIso8601String())->toBe(now()->addDays(14)->toIso8601String())
        ->and($owner['user']['subscription']['status'])->toBe('TRIAL')
        ->and($owner['user']['subscription']['remaining_days'])->toBe(14)
        ->and($owner['user']['subscription']['trial_days'])->toBe(14);
    Event::assertDispatched(SubscriptionLifecycleEvent::class, fn ($e) => $e->name === 'trial_started' && $e->restaurantId === $owner['id']);
    expect(DB::table('audit_logs')->where('action', 'subscription.trial_started')->where('restaurant_id', $owner['id'])->exists())->toBeTrue();
});

it('rolls the registration back if the trial cannot be created', function () {
    Event::listen(SubscriptionLifecycleEvent::class, fn () => throw new RuntimeException('boom'));

    $this->withoutExceptionHandling();
    expect(fn () => registerOwner($this))->toThrow(RuntimeException::class);
    expect(User::where('role', 'owner')->count())->toBe(0);
});

it('counts down 14 → 7 → 3 → last day from the server and fires each milestone once', function () {
    $this->freezeTime();
    Event::fake([SubscriptionLifecycleEvent::class]);
    $owner = registerOwner($this);
    $me = fn () => $this->getJson('/api/auth/me', authAs($owner))->json('data.subscription');

    expect($me()['phase'])->toBe('normal');
    $this->travel(7)->days();
    expect($me())->toMatchArray(['status' => 'TRIAL', 'remaining_days' => 7, 'phase' => 'week']);
    $this->travel(4)->days();
    expect($me())->toMatchArray(['remaining_days' => 3, 'phase' => 'urgent']);
    $this->travel(2)->days();
    expect($me())->toMatchArray(['remaining_days' => 1, 'phase' => 'last_day']);
    $me(); // second read: no duplicate events

    foreach (['trial_started', 'trial_7_days_remaining', 'trial_3_days_remaining', 'trial_1_day_remaining'] as $name) {
        expect(Event::dispatched(SubscriptionLifecycleEvent::class, fn ($e) => $e->name === $name))->toHaveCount(1);
    }
});

it('expires after 14 days, allows a grace period, then restricts operations but keeps data', function () {
    $this->freezeTime();
    $owner = registerOwner($this);
    $table = makeTable($owner['id'], 'T1');
    $item = makeItem($owner['id'], 10);
    DB::table('users')->where('id', $owner['id'])->update(['latitude' => 31.5, 'longitude' => 34.46, 'payment_timing' => 'after']); // this test orders directly
    $s = openSession($this, $table);
    $orderId = $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => $item, 'quantity' => 1]]], customer($s))->assertCreated()->json('data.id');

    // Day 14: trial over → EXPIRED, grace (3 days) keeps operations running.
    $this->travel(14)->days();
    $sub = $this->getJson('/api/auth/me', authAs($owner))->json('data.subscription');
    expect($sub)->toMatchArray(['status' => 'EXPIRED', 'phase' => 'grace', 'in_grace' => true, 'can_operate' => true, 'remaining_days' => 0]);
    $this->postJson('/api/tables', ['label' => 'G1', 'seats' => 2], authAs($owner))->assertCreated();

    // Grace over → restricted mode.
    $this->travel(3)->days();
    $sub = $this->getJson('/api/auth/me', authAs($owner))->json('data.subscription');
    expect($sub)->toMatchArray(['status' => 'EXPIRED', 'phase' => 'expired', 'restricted' => true, 'can_operate' => false]);

    // Operational actions blocked (owner and customers).
    $this->postJson('/api/tables', ['label' => 'X', 'seats' => 2], authAs($owner))->assertForbidden()->assertJsonPath('code', 'SUBSCRIPTION_RESTRICTED');
    $this->postJson('/api/menu-items', ['name' => 'New', 'price' => 5], authAs($owner))->assertForbidden();
    $this->patchJson("/api/menu-items/{$item}", ['price' => 11], authAs($owner))->assertForbidden();
    $this->getJson("/api/tables/{$table->id}/qr", authAs($owner))->assertForbidden();
    $this->postJson('/api/staff', ['name' => 'W', 'email' => 'w@x.test', 'role' => 'waiter'], authAs($owner))->assertForbidden();
    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => $item, 'quantity' => 1]]], customer($s))->assertForbidden()->assertJsonPath('code', 'SUBSCRIPTION_RESTRICTED');
    $this->postJson("/api/public/tables/{$table->table_code}/sessions", ['name' => 'N', 'phone' => '0599000000', 'latitude' => 31.5, 'longitude' => 34.46])->assertForbidden();

    // Data, reports, exports, billing and settings stay available; nothing deleted.
    $this->getJson('/api/tables', authAs($owner))->assertOk();
    $this->getJson('/api/menu-items', authAs($owner))->assertOk()->assertJsonPath('data.0.id', $item);
    $this->getJson('/api/owner/orders', authAs($owner))->assertOk()->assertJsonPath('data.0.id', $orderId);
    $this->getJson('/api/owner/reports/sales-trend', authAs($owner))->assertOk();
    $this->get('/api/reports/export/sales?invoice_status=all', authAs($owner))->assertOk();
    $this->getJson('/api/me/restaurant', authAs($owner))->assertOk();
    $this->getJson('/api/staff', authAs($owner))->assertOk();
    $this->patchJson('/api/me/plan', ['plan' => 'pro'], authAs($owner))->assertStatus(202);
    expect(DB::table('orders')->where('id', $orderId)->exists())->toBeTrue();
    expect(DB::table('audit_logs')->whereIn('action', ['subscription.trial_expired', 'subscription.subscription_restricted'])->where('restaurant_id', $owner['id'])->count())->toBe(2);
});

it('does not let the owner activate a plan or change trial/status by themselves', function () {
    $this->freezeTime();
    $owner = registerOwner($this);
    $this->travel(20)->days();

    $res = $this->patchJson('/api/me/plan', ['plan' => 'pro', 'addons' => ['delivery']], authAs($owner))->assertStatus(202)->assertJsonPath('meta.status', 'pending_payment');
    expect($res->json('data.subscription.status'))->toBe('EXPIRED')
        ->and($res->json('data.requested_plan'))->toBe('pro')
        ->and($res->json('data.requested_addons'))->toBe(['delivery'])
        ->and($res->json('data.subscription.features'))->not->toContain('online_orders'); // requested ≠ active
    $this->patchJson('/api/me/restaurant', ['restaurant_name' => 'X', 'trial_ends_at' => '2099-01-01', 'plan' => 'premium', 'subscription_status' => 'ACTIVE'], authAs($owner))->assertOk();

    $u = User::find($owner['id']);
    expect($u->plan)->toBe('trial')->and($u->trial_ends_at->isPast())->toBeTrue();
    $this->postJson('/api/tables', ['label' => 'X', 'seats' => 2], authAs($owner))->assertForbidden();
});

it('restores full access when the admin activates the paid plan (after payment)', function () {
    $this->freezeTime();
    $owner = registerOwner($this);
    $admin = trialAdmin();
    $this->travel(20)->days();
    $this->patchJson('/api/me/plan', ['plan' => 'pro'], authAs($owner))->assertStatus(202);

    $row = collect($this->getJson('/api/admin/restaurants', authAs($admin))->json('data'))->firstWhere('id', $owner['id']);
    expect($row['subscription']['status'])->toBe('EXPIRED')->and($row['requested_plan'])->toBe('pro');

    $this->patchJson("/api/admin/restaurants/{$owner['id']}/plan", ['plan' => 'pro'], authAs($admin))->assertOk();
    expect($this->getJson('/api/auth/me', authAs($owner))->json('data.subscription'))->toMatchArray(['status' => 'ACTIVE', 'can_operate' => true]);
    $this->postJson('/api/tables', ['label' => 'Back', 'seats' => 2], authAs($owner))->assertCreated();
    expect(DB::table('audit_logs')->where('action', 'subscription.subscription_activated')->exists())->toBeTrue();

    // Cancelling restricts again, still without deleting anything.
    $this->postJson("/api/admin/restaurants/{$owner['id']}/subscription/cancel", [], authAs($admin))->assertOk()->assertJsonPath('data.subscription.status', 'CANCELLED');
    $this->postJson('/api/tables', ['label' => 'No', 'seats' => 2], authAs($owner))->assertForbidden();
    $this->getJson('/api/tables', authAs($owner))->assertOk();
});

it('lets the admin extend a trial (audited) and staff follow their restaurant\'s state', function () {
    $this->freezeTime();
    $owner = registerOwner($this);
    $cashier = makeStaff($owner['id'], 'cashier');
    $admin = trialAdmin();
    $this->travel(18)->days();
    expect($this->getJson('/api/auth/me', authAs($cashier))->json('data.subscription.restricted'))->toBeTrue();

    $this->postJson("/api/admin/restaurants/{$owner['id']}/trial/extend", ['days' => 7], authAs($admin))->assertOk();
    $sub = $this->getJson('/api/auth/me', authAs($owner))->json('data.subscription');
    expect($sub)->toMatchArray(['status' => 'TRIAL', 'remaining_days' => 7, 'can_operate' => true]);
    expect(DB::table('audit_logs')->where('action', 'admin.trial_extended')->exists())->toBeTrue();
    $this->postJson('/api/order-items/999/cancel', ['reason' => 'x x'], authAs($cashier))->assertNotFound(); // passes subscription + permission
});

it('keeps each restaurant\'s subscription independent', function () {
    $this->freezeTime();
    $expired = registerOwner($this);
    $this->travel(20)->days();
    $fresh = registerOwner($this);

    $this->postJson('/api/tables', ['label' => 'A', 'seats' => 2], authAs($expired))->assertForbidden();
    $this->postJson('/api/tables', ['label' => 'B', 'seats' => 2], authAs($fresh))->assertCreated();
    expect($this->getJson('/api/auth/me', authAs($fresh))->json('data.subscription.status'))->toBe('TRIAL');
});

it('repairs trials that the old code had turned into a free Basic plan', function () {
    $id = DB::table('users')->insertGetId(['name' => 'Old', 'email' => 'old@x.test', 'password' => Hash::make('x'), 'role' => 'owner', 'plan' => 'basic', 'trial_started_at' => now()->subDays(30), 'trial_ends_at' => now()->subDays(16), 'subscription_started_at' => null, 'created_at' => now(), 'updated_at' => now()]);
    $paid = DB::table('users')->insertGetId(['name' => 'Paid', 'email' => 'paid@x.test', 'password' => Hash::make('x'), 'role' => 'owner', 'plan' => 'basic', 'trial_ends_at' => now()->subDays(16), 'subscription_started_at' => now()->subDays(10), 'created_at' => now(), 'updated_at' => now()]);

    (require database_path('migrations/2026_09_28_140000_add_subscription_state.php'))->up();

    expect(DB::table('users')->where('id', $id)->value('plan'))->toBe('trial')
        ->and(DB::table('users')->where('id', $paid)->value('plan'))->toBe('basic');
});
