<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

it('turns an owner forgot-password into an admin request and the admin link resets the password', function () {
    $owner = makeOwner('Zaytoona');
    DB::table('users')->where('id', $owner['id'])->update(['restaurant_phone' => '0599000111']);
    $admin = makeAdmin();
    $email = DB::table('users')->where('id', $owner['id'])->value('email');

    $msg = $this->postJson('/api/auth/forgot-password', ['email' => $email])->assertOk()->json('message');
    expect($this->postJson('/api/auth/forgot-password', ['email' => 'nobody@x.test'])->json('message'))->toBe($msg); // no enumeration
    $this->postJson('/api/auth/forgot-password', ['email' => $email])->assertOk(); // repeat keeps one pending request
    expect(DB::table('password_reset_requests')->where('status', 'pending')->count())->toBe(1);

    $this->getJson('/api/admin/password-requests', authAs($owner))->assertForbidden();
    $req = $this->getJson('/api/admin/password-requests', authAs($admin))->assertOk()->json('data.0');
    expect($req['restaurant_phone'])->toBe('0599000111');

    $link = $this->postJson("/api/admin/password-requests/{$req['id']}/link", [], authAs($admin))->assertOk()->json('data');
    $this->postJson('/api/auth/reset-password', ['token' => $link['token'], 'email' => $link['email'], 'password' => 'NewPass#2026', 'password_confirmation' => 'NewPass#2026'])->assertOk();
    // The auth service signs in against the credential account: both copies hold the new password…
    expect(Hash::check('NewPass#2026', DB::table('users')->where('id', $owner['id'])->value('password')))->toBeTrue()
        ->and(Hash::check('NewPass#2026', credentialHash($owner['id'])))->toBeTrue();
    // …and every device was signed out.
    $this->getJson('/api/auth/me', authAs($owner))->assertUnauthorized()->assertJsonPath('code', 'SESSION_EXPIRED');
    expect(DB::table('auth_sessions')->where('user_id', $owner['id'])->count())->toBe(0)
        ->and(DB::table('password_reset_requests')->value('status'))->toBe('sent');
    // The one-time link can't be reused.
    $this->postJson('/api/account/reset-password', ['token' => $link['token'], 'email' => $link['email'], 'password' => 'Other#Pass2026', 'password_confirmation' => 'Other#Pass2026'])
        ->assertStatus(422)->assertJsonPath('code', 'RESET_TOKEN_INVALID');
});

it('does not create admin requests for staff; the owner changes staff passwords', function () {
    $owner = makeOwner();
    $waiter = makeStaff($owner['id'], 'waiter');
    $email = DB::table('users')->where('id', $waiter['id'])->value('email');
    $this->postJson('/api/auth/forgot-password', ['email' => $email])->assertOk();
    expect(DB::table('password_reset_requests')->count())->toBe(0);

    $staffId = DB::table('staff')->where('account_user_id', $waiter['id'])->value('id');
    $this->putJson("/api/staff/{$staffId}", ['password' => 'Waiter#2026'], authAs($owner))->assertOk();
    $this->getJson('/api/auth/me', authAs($waiter))->assertUnauthorized(); // old session ends
    expect(Hash::check('Waiter#2026', credentialHash($waiter['id'])))->toBeTrue(); // signs in with the new one
});

function credentialHash(int $userId): ?string
{
    return DB::table('auth_accounts')->where(['provider_id' => 'credential', 'account_id' => (string) $userId])->value('password');
}
