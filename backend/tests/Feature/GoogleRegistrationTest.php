<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function googlePending(array $fields = []): array
{
    $token = bin2hex(random_bytes(32));
    $secret = 'test-google-secret-01234567890123456789';
    config(['auth_service.secret' => $secret]);
    $hash = hash('sha256', $token);
    DB::table('google_registrations')->insert(array_merge([
        'token_hash' => $hash, 'email' => 'new-google@example.test', 'subject' => 'google-new',
        'expires_at' => now()->addMinutes(10), 'created_at' => now(),
    ], $fields));

    return ['Cookie' => 'menupilot.google_registration='.rawurlencode($token.'.'.base64_encode(hash_hmac('sha256', $token, $secret, true))), 'X-Google-Registration' => $hash];
}

it('creates a verified owner and trial once and ignores client identity and privileges', function () {
    $headers = googlePending();
    $body = ['restaurant_name' => 'Olive', 'restaurant_type' => 'cafe', 'email' => 'forged@example.test', 'role' => 'admin', 'plan' => 'enterprise'];
    $this->postJson('/api/account/register/google', $body, $headers)->assertOk();
    $owner = User::where('email', 'new-google@example.test')->firstOrFail();
    expect($owner->role)->toBe('owner');
    expect($owner->email_verified)->toBeTrue();
    expect($owner->restaurant_type)->toBe('cafe');
    expect($owner->plan)->toBe('trial');
    expect($owner->trial_ends_at->diffInDays($owner->trial_started_at, true))->toBe(14.0);
    $this->assertDatabaseHas('auth_accounts', ['provider_id' => 'google', 'account_id' => 'google-new', 'user_id' => $owner->id]);
    $this->assertDatabaseCount('auth_sessions', 0);
    $started = $owner->trial_started_at->toISOString();
    $this->travel(1)->minutes();
    $this->postJson('/api/account/register/google', $body, $headers)->assertOk();
    expect($owner->fresh()->trial_started_at->toISOString())->toBe($started);
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseCount('auth_accounts', 1);
});

it('allows validation retry without creating an incomplete account', function () {
    $headers = googlePending();
    $this->postJson('/api/account/register/google', [], $headers)->assertUnprocessable()->assertJsonValidationErrors(['restaurant_name', 'restaurant_type']);
    $this->assertDatabaseCount('users', 0);
    $this->postJson('/api/account/register/google', ['restaurant_name' => 'Olive', 'restaurant_type' => 'restaurant'], $headers)->assertOk();
});

it('rejects missing forged expired and cross-site credentials', function () {
    $body = ['restaurant_name' => 'Olive', 'restaurant_type' => 'cafe'];
    $headers = googlePending();
    $this->postJson('/api/account/register/google', $body)->assertUnauthorized();
    $this->postJson('/api/account/register/google', $body, array_merge($headers, ['X-Google-Registration' => 'forged']))->assertForbidden();
    $this->postJson('/api/account/register/google', $body, $headers + ['Sec-Fetch-Site' => 'cross-site'])->assertForbidden();
    DB::table('google_registrations')->update(['expires_at' => now()->subSecond()]);
    $this->postJson('/api/account/register/google', $body, $headers)->assertUnauthorized();
    $this->assertDatabaseCount('users', 0);
});

it('requires normal linking if an account appears between OAuth and completion', function () {
    $headers = googlePending();
    User::factory()->create(['email' => 'new-google@example.test', 'email_verified' => false]);
    $this->postJson('/api/account/register/google', ['restaurant_name' => 'Olive', 'restaurant_type' => 'cafe'], $headers)->assertConflict();
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseCount('auth_accounts', 0);
});

it('rolls the restaurant and trial back when the Google subject was already claimed', function () {
    $headers = googlePending();
    $owner = User::factory()->create(['email' => 'existing@example.test']);
    DB::table('auth_accounts')->insert(['id' => 'claimed-google', 'user_id' => $owner->id, 'provider_id' => 'google', 'account_id' => 'google-new', 'created_at' => now(), 'updated_at' => now()]);
    $this->postJson('/api/account/register/google', ['restaurant_name' => 'Olive', 'restaurant_type' => 'cafe'], $headers)->assertConflict();
    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseMissing('users', ['email' => 'new-google@example.test']);
});
