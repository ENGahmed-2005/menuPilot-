<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

/** Open a session on a fresh table, order one item at the given price. */
function sessionWithOrder($test, int $ownerId, float $price = 20, string $label = 'T5'): array
{
    $table = makeTable($ownerId, $label);
    $s = openSession($test, $table);
    $test->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => makeItem($ownerId, $price), 'quantity' => 1]]], customer($s))->assertCreated();

    return ['session' => $s, 'table' => $table];
}

function makeAdmin(): array
{
    $token = 'admin-token-'.uniqid();
    $id = DB::table('users')->insertGetId([
        'name' => 'Admin', 'email' => uniqid().'@admin.test', 'password' => Hash::make('Admin#Pass123'),
        'role' => 'admin', 'created_at' => now(), 'updated_at' => now(),
    ]);

    return ['id' => $id, 'token' => authSession($id, $token)];
}

/*
|--------------------------------------------------------------------------
| Session lifecycle and closing
|--------------------------------------------------------------------------
*/

it('marks the table occupied when a session opens and exposes the lifecycle', function () {
    $owner = makeOwner();
    $cashier = makeStaff($owner['id'], 'cashier');
    ['session' => $s] = sessionWithOrder($this, $owner['id']);

    $tables = $this->getJson('/api/tables', authAs($cashier))->assertOk()->json('data');
    expect($tables[0]['status'])->toBe('occupied')->and($tables[0]['activeSessionId'])->toBe($s['id']);

    $session = $this->getJson('/api/sessions', authAs($cashier))->json('data.0');
    expect($session['lifecycle'])->toBe('active')
        ->and($session['canClose'])->toBeFalse()
        ->and($session['closeBlocker'])->toBe('OUTSTANDING_BALANCE')
        ->and((float) $session['outstanding'])->toBe(20.0);

    $this->postJson("/api/public/sessions/{$s['id']}/bill-request", [], customer($s))->assertOk();
    expect($this->getJson('/api/sessions', authAs($cashier))->json('data.0.lifecycle'))->toBe('bill_requested');
});

it('refuses to close with an outstanding amount or a payment awaiting verification', function () {
    $owner = makeOwner();
    $cashier = makeStaff($owner['id'], 'cashier');
    ['session' => $s] = sessionWithOrder($this, $owner['id'], 30);

    $this->postJson("/api/sessions/{$s['id']}/close", [], authAs($cashier))->assertStatus(422)->assertJsonPath('code', 'OUTSTANDING_BALANCE');

    DB::table('payments')->insert(['dining_session_id' => $s['id'], 'method' => 'bank', 'status' => 'pending', 'amount' => 30, 'created_at' => now(), 'updated_at' => now()]);
    $this->postJson("/api/sessions/{$s['id']}/close", [], authAs($cashier))->assertStatus(409)->assertJsonPath('code', 'PAYMENT_PENDING_VERIFICATION');
    expect($this->getJson('/api/sessions', authAs($cashier))->json('data.0.lifecycle'))->toBe('payment_pending');
});

it('closes a paid session: table available, waiter calls resolved, audit written, second close rejected', function () {
    $owner = makeOwner();
    $cashier = makeStaff($owner['id'], 'cashier');
    ['session' => $s, 'table' => $table] = sessionWithOrder($this, $owner['id'], 25);
    $this->postJson("/api/public/sessions/{$s['id']}/assistance-requests", [], customer($s))->assertCreated();

    $this->postJson("/api/sessions/{$s['id']}/payment", ['method' => 'cash', 'close' => false], authAs($cashier))->assertCreated();
    $bill = $this->getJson("/api/sessions/{$s['id']}/bill", authAs($cashier))->json('data');
    expect($bill['lifecycle'])->toBe('paid')->and($bill['can_close'])->toBeTrue();

    $this->postJson("/api/sessions/{$s['id']}/close", [], authAs($cashier))->assertOk()->assertJsonPath('data.status', 'closed');

    expect(DB::table('restaurant_tables')->where('id', $table->id)->value('status'))->toBe('available')
        ->and(DB::table('dining_sessions')->where('id', $s['id'])->value('closed_at'))->not->toBeNull()
        ->and(DB::table('assistance_requests')->where('dining_session_id', $s['id'])->value('status'))->toBe('resolved')
        ->and(DB::table('audit_logs')->where('action', 'session.closed')->where('entity_id', $s['id'])->exists())->toBeTrue()
        ->and($this->getJson('/api/sessions', authAs($cashier))->json('data'))->toBe([]);

    $this->postJson("/api/sessions/{$s['id']}/close", [], authAs($cashier))->assertStatus(409)->assertJsonPath('code', 'SESSION_ALREADY_CLOSED');
});

/*
|--------------------------------------------------------------------------
| Permissions
|--------------------------------------------------------------------------
*/

it('only lets roles with close_session close a session', function () {
    $owner = makeOwner();
    $waiter = makeStaff($owner['id'], 'waiter');
    $kitchen = makeStaff($owner['id'], 'kitchen');
    ['session' => $s] = sessionWithOrder($this, $owner['id']);
    $this->postJson("/api/sessions/{$s['id']}/payment", ['method' => 'cash', 'close' => false], authAs($owner))->assertCreated();

    foreach ([$waiter, $kitchen] as $user) {
        $this->postJson("/api/sessions/{$s['id']}/close", [], authAs($user))->assertForbidden()->assertJsonPath('code', 'PERMISSION_DENIED');
    }
    // Owner has every restaurant permission.
    $this->postJson("/api/sessions/{$s['id']}/close", [], authAs($owner))->assertOk();
});

it('honours custom permissions set by the owner', function () {
    $owner = makeOwner();
    $waiter = makeStaff($owner['id'], 'waiter');
    $staffId = DB::table('staff')->where('account_user_id', $waiter['id'])->value('id');

    // Grant close_session to this waiter explicitly.
    $this->patchJson("/api/staff/{$staffId}", ['permissions' => ['view_tables', 'view_payments', 'close_session']], authAs($owner))
        ->assertOk()->assertJsonPath('data.custom_permissions', true);
    // Access changes revoke the token; sign the waiter in again with a fresh one.
    authSession($waiter['id'], 'fresh-waiter');
    $waiter['token'] = 'fresh-waiter';

    ['session' => $s] = sessionWithOrder($this, $owner['id']);
    $this->postJson("/api/sessions/{$s['id']}/payment", ['method' => 'cash', 'close' => false], authAs($owner))->assertCreated();
    $this->postJson("/api/sessions/{$s['id']}/close", [], authAs($waiter))->assertOk();
    // …but record_payment was not granted.
    ['session' => $s2] = sessionWithOrder($this, $owner['id'], 10, 'T9');
    $this->postJson("/api/sessions/{$s2['id']}/payment", ['method' => 'cash'], authAs($waiter))->assertForbidden();
});

it('blocks kitchen and waiter from actions outside their role', function () {
    $owner = makeOwner();
    $kitchen = makeStaff($owner['id'], 'kitchen');
    $waiter = makeStaff($owner['id'], 'waiter');

    $this->getJson('/api/staff', authAs($kitchen))->assertForbidden();
    $this->postJson('/api/tables', ['label' => 'X', 'seats' => 2], authAs($waiter))->assertForbidden();
    $this->getJson('/api/payments/pending', authAs($waiter))->assertForbidden();
    $this->getJson('/api/kitchen/orders', authAs($waiter))->assertForbidden();
    $this->getJson('/api/kitchen/orders', authAs($kitchen))->assertOk();
});

it('stops a manager from granting permissions they do not have or editing themselves', function () {
    $owner = makeOwner();
    $cashier = makeStaff($owner['id'], 'cashier');
    // Give the cashier manage_staff but nothing else beyond defaults.
    DB::table('staff')->where('account_user_id', $cashier['id'])->update(['permissions' => json_encode(['manage_staff', 'view_tables'])]);
    $selfId = DB::table('staff')->where('account_user_id', $cashier['id'])->value('id');

    $this->postJson('/api/staff', ['name' => 'Boss', 'email' => 'boss@x.test', 'role' => 'manager'], authAs($cashier))
        ->assertForbidden()->assertJsonPath('code', 'PERMISSION_ESCALATION');
    $this->patchJson("/api/staff/{$selfId}", ['permissions' => ['manage_menu']], authAs($cashier))
        ->assertForbidden()->assertJsonPath('code', 'SELF_EDIT_FORBIDDEN');
});

it('disabling a staff member signs them out, blocks API access and keeps the record', function () {
    $owner = makeOwner();
    $cashier = makeStaff($owner['id'], 'cashier');
    $staffId = DB::table('staff')->where('account_user_id', $cashier['id'])->value('id');

    $this->patchJson("/api/staff/{$staffId}/status", ['active' => false], authAs($owner))->assertOk()->assertJsonPath('data.active', false);

    $this->getJson('/api/sessions', authAs($cashier))->assertStatus(401)->assertJsonPath('code', 'SESSION_EXPIRED'); // every device signed out
    expect(DB::table('auth_sessions')->where('user_id', $cashier['id'])->count())->toBe(0);
    // A session created anyway (the auth service refuses to) is still turned away.
    $again = ['token' => authSession($cashier['id'])];
    $this->getJson('/api/sessions', authAs($again))->assertForbidden()->assertJsonPath('code', 'ACCOUNT_DISABLED');
    expect(DB::table('staff')->where('id', $staffId)->exists())->toBeTrue()
        ->and(DB::table('audit_logs')->where('action', 'staff.access_changed')->exists())->toBeTrue();

    $this->patchJson("/api/staff/{$staffId}/status", ['active' => true], authAs($owner))->assertOk();
    $this->getJson('/api/auth/me', authAs($again))->assertOk()
        ->assertJsonPath('data.permissions', fn ($p) => in_array('close_session', $p, true));
});

it('keeps owners inside their own restaurant even with full permissions', function () {
    $a = makeOwner('A');
    $b = makeOwner('B');
    ['session' => $s] = sessionWithOrder($this, $a['id']);
    $bStaffId = DB::table('staff')->where('account_user_id', makeStaff($b['id'], 'waiter')['id'])->value('id');

    $this->postJson("/api/sessions/{$s['id']}/close", [], authAs($b))->assertNotFound();
    $this->patchJson("/api/staff/{$bStaffId}", ['role' => 'cashier'], authAs($a))->assertNotFound();
    expect($this->getJson('/api/owner/audit-logs', authAs($b))->json('data'))->toBe([]);
});

it('rejects anonymous access to staff and admin endpoints', function () {
    $this->getJson('/api/staff')->assertUnauthorized();
    $this->postJson('/api/sessions/1/close')->assertUnauthorized();
    $this->getJson('/api/admin/restaurants')->assertUnauthorized();
});

/*
|--------------------------------------------------------------------------
| Admin
|--------------------------------------------------------------------------
*/

it('returns 403 on admin routes for every non-admin role', function () {
    $owner = makeOwner();
    foreach ([$owner, makeStaff($owner['id'], 'cashier'), makeStaff($owner['id'], 'manager')] as $user) {
        $this->getJson('/api/admin/restaurants', authAs($user))->assertForbidden();
        $this->patchJson("/api/admin/owners/{$owner['id']}/status", ['active' => false], authAs($user))->assertForbidden();
    }
});

it('lets the admin manage owners, and disabling an owner locks out their staff', function () {
    $admin = makeAdmin();
    $owner = makeOwner();
    $cashier = makeStaff($owner['id'], 'cashier');

    $this->getJson('/api/admin/restaurants', authAs($admin))->assertOk()->assertJsonPath('data.0.id', $owner['id']);
    $this->patchJson("/api/admin/restaurants/{$owner['id']}/plan", ['plan' => 'pro', 'addons' => ['delivery']], authAs($admin))->assertOk();
    $this->patchJson("/api/admin/owners/{$owner['id']}/status", ['active' => false], authAs($admin))->assertOk();

    // The staff's sessions are deleted at once, and a new one is still refused.
    $this->getJson('/api/sessions', authAs($cashier))->assertUnauthorized()->assertJsonPath('code', 'SESSION_EXPIRED');
    $this->getJson('/api/sessions', authAs(['token' => authSession($cashier['id'])]))->assertForbidden()->assertJsonPath('code', 'ACCOUNT_DISABLED');
    expect(DB::table('audit_logs')->whereIn('action', ['admin.plan_changed', 'admin.owner_disabled'])->count())->toBe(2);
});

it('AdminSeeder creates one admin from env, never duplicates, never promotes an owner', function () {
    config(['app.admin' => ['name' => 'Root', 'email' => 'root@menupilot.test', 'password' => 'Very-Long-Pass-123', 'reset_password' => false]]);

    $this->artisan('db:seed', ['--class' => 'AdminSeeder', '--force' => true])->assertSuccessful();
    $this->artisan('db:seed', ['--class' => 'AdminSeeder', '--force' => true])->assertSuccessful();
    expect(User::where('role', 'admin')->count())->toBe(1);

    $hash = User::where('email', 'root@menupilot.test')->value('password');
    expect(Hash::check('Very-Long-Pass-123', $hash))->toBeTrue();

    // Ready for the auth service: credential account and no verification e-mail in the way.
    $adminId = User::where('email', 'root@menupilot.test')->value('id');
    expect(Hash::check('Very-Long-Pass-123', DB::table('auth_accounts')->where(['provider_id' => 'credential', 'account_id' => (string) $adminId])->value('password')))->toBeTrue()
        ->and(User::find($adminId)->email_verified)->toBeTrue();
    $me = $this->getJson('/api/auth/me', authAs(['token' => authSession($adminId)]))->assertOk();
    expect($me->json('data.role'))->toBe('admin')->and($me->json('data.permissions'))->toContain('manage_admin');

    // A different email while an admin exists: no second admin.
    config(['app.admin.email' => 'second@menupilot.test']);
    $this->artisan('db:seed', ['--class' => 'AdminSeeder', '--force' => true])->assertSuccessful();
    expect(User::where('role', 'admin')->count())->toBe(1);

    // An owner's email is never promoted.
    $owner = makeOwner();
    $ownerEmail = DB::table('users')->where('id', $owner['id'])->value('email');
    $this->artisan('menupilot:create-admin', ['--email' => $ownerEmail, '--additional' => true])->assertFailed();
    expect(DB::table('users')->where('id', $owner['id'])->value('role'))->toBe('owner');

});
