<?php

use App\Support\AuthSessions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/*
| Sessions written by the Better Auth service (auth/), read by Laravel:
| App\Support\AuthSessions and App\Http\Middleware\ApiAuth.
*/

/** The cookie value Better Auth sets: encodeURIComponent("<token>.<base64 HMAC-SHA256>"). */
function signedCookie(string $token, string $secret): string
{
    return rawurlencode($token.'.'.base64_encode(hash_hmac('sha256', $token, $secret, true)));
}

function withCookie(string $name, string $value): array
{
    return ['Cookie' => "other=1; {$name}={$value}", 'Accept' => 'application/json'];
}

it('signs in with the session cookie under either name, and with a Bearer session token', function () {
    $owner = makeOwner();

    $this->getJson('/api/account/me', withCookie('__Secure-menupilot.session_token', rawurlencode($owner['token'].'.sig')))
        ->assertOk()->assertJsonPath('data.id', $owner['id']);
    $this->getJson('/api/account/me', withCookie('menupilot.session_token', $owner['token']))
        ->assertOk()->assertJsonPath('data.id', $owner['id']);
    $this->getJson('/api/account/me', authAs($owner))->assertOk()->assertJsonPath('data.two_factor_enabled', false);
});

it('refuses missing, unknown, expired and revoked sessions', function () {
    $owner = makeOwner();
    $expired = authSession($owner['id'], null, now()->subMinute());

    $this->getJson('/api/account/me')->assertUnauthorized();
    $this->getJson('/api/account/me', authAs(['token' => Str::random(32)]))->assertUnauthorized()->assertJsonPath('code', 'SESSION_EXPIRED');
    $this->getJson('/api/account/me', authAs(['token' => $expired]))->assertUnauthorized()->assertJsonPath('code', 'SESSION_EXPIRED');

    AuthSessions::revokeFor($owner['id']);
    $this->getJson('/api/account/me', authAs($owner))->assertUnauthorized();
});

it('checks the cookie signature when the auth service secret is configured', function () {
    config(['auth_service.secret' => 'test-secret-that-is-long-enough-123']);
    $owner = makeOwner();

    $this->getJson('/api/account/me', withCookie('__Secure-menupilot.session_token', signedCookie($owner['token'], 'test-secret-that-is-long-enough-123')))
        ->assertOk()->assertJsonPath('data.id', $owner['id']);
    // Right token, signed with another secret, or not signed at all.
    $this->getJson('/api/account/me', withCookie('__Secure-menupilot.session_token', signedCookie($owner['token'], 'another-secret')))
        ->assertUnauthorized();
    $this->getJson('/api/account/me', withCookie('__Secure-menupilot.session_token', $owner['token']))->assertUnauthorized();

    // The same rule for a Bearer session token: signed, never bare.
    $this->getJson('/api/account/me', authAs(['token' => signedCookie($owner['token'], 'test-secret-that-is-long-enough-123')]))
        ->assertOk()->assertJsonPath('data.id', $owner['id']);
    $this->getJson('/api/account/me', authAs($owner))->assertUnauthorized();
});

it('keeps legacy tokens for the demo accounts only', function () {
    $owner = makeOwner();
    $legacy = Str::random(60);
    DB::table('users')->where('id', $owner['id'])->update(['api_token' => hash('sha256', $legacy)]);

    $this->getJson('/api/account/me', authAs(['token' => $legacy]))->assertUnauthorized()->assertJsonPath('code', 'SESSION_EXPIRED');

    DB::table('users')->where('id', $owner['id'])->update(['is_demo' => true]);
    $this->getJson('/api/account/me', authAs(['token' => $legacy]))->assertOk()->assertJsonPath('data.id', $owner['id']);
});

it('lets an explicit Authorization header decide on its own, not a leftover cookie', function () {
    $owner = makeOwner();
    $headers = withCookie('menupilot.session_token', $owner['token']) + ['Authorization' => 'Bearer '.Str::random(32)];

    $this->getJson('/api/account/me', $headers)->assertUnauthorized();
});

it('refuses cross-site changes made with the cookie', function () {
    $owner = makeOwner();
    $cookie = withCookie('menupilot.session_token', $owner['token']);

    $this->patchJson('/api/me/restaurant', ['restaurant_name' => 'X'], $cookie + ['Sec-Fetch-Site' => 'cross-site'])
        ->assertForbidden()->assertJsonPath('code', 'CROSS_SITE_REQUEST');
    $this->getJson('/api/account/me', $cookie + ['Sec-Fetch-Site' => 'cross-site'])->assertOk();
});

it('still refuses a disabled account that holds a valid session', function () {
    $owner = makeOwner();
    DB::table('users')->where('id', $owner['id'])->update(['is_active' => false]);

    $this->getJson('/api/account/me', authAs($owner))->assertForbidden()->assertJsonPath('code', 'ACCOUNT_DISABLED');
});

it('signs staff out of every device when disabled, given a new role or a new password', function () {
    $owner = makeOwner();
    foreach ([['active' => false], ['role' => 'kitchen'], ['password' => 'NewPass#2026']] as $change) {
        $cashier = makeStaff($owner['id'], 'cashier');
        $staffId = DB::table('staff')->where('account_user_id', $cashier['id'])->value('id');
        $this->getJson('/api/account/me', authAs($cashier))->assertOk();

        $this->putJson("/api/staff/{$staffId}", $change, authAs($owner))->assertOk();
        expect(DB::table('auth_sessions')->where('user_id', $cashier['id'])->count())->toBe(0);
    }
    // The new password is what the auth service will check.
    $account = DB::table('auth_accounts')->where(['provider_id' => 'credential', 'account_id' => (string) $cashier['id']])->first();
    expect(Hash::check('NewPass#2026', $account->password))->toBeTrue();
});

it('sends an app cached from before to the new sign-in', function () {
    $this->postJson('/api/auth/login', ['email' => 'a@b.test', 'password' => 'x'])
        ->assertStatus(410)->assertJsonPath('code', 'USE_NEW_LOGIN');
});

it('registers a restaurant without a token and with a credential account', function () {
    $res = $this->postJson('/api/account/register', [
        'restaurant_name' => 'Zaytoona', 'email' => '  Owner@Zaytoona.TEST ',
        'password' => 'Secret#123', 'password_confirmation' => 'Secret#123',
    ])->assertCreated()->assertJsonMissingPath('data.token');

    $id = $res->json('data.user.id');
    expect($res->json('data.user.email'))->toBe('owner@zaytoona.test');
    $account = DB::table('auth_accounts')->where(['provider_id' => 'credential', 'account_id' => (string) $id])->first();
    expect($account)->not->toBeNull()->and(Hash::check('Secret#123', $account->password))->toBeTrue();
});

it('resets a password through the admin link and signs every device out', function () {
    $owner = makeOwner();
    $email = DB::table('users')->where('id', $owner['id'])->value('email');
    $token = Str::random(64);
    DB::table('password_reset_tokens')->insert(['email' => $email, 'token' => hash('sha256', $token), 'created_at' => now()]);

    $this->postJson('/api/account/reset-password', [
        'token' => $token, 'email' => $email, 'password' => 'Fresh#Pass9', 'password_confirmation' => 'Fresh#Pass9',
    ])->assertOk();

    expect(DB::table('auth_sessions')->where('user_id', $owner['id'])->count())->toBe(0);
    $account = DB::table('auth_accounts')->where(['provider_id' => 'credential', 'account_id' => (string) $owner['id']])->first();
    expect(Hash::check('Fresh#Pass9', $account->password))->toBeTrue();
});
