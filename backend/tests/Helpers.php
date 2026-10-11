<?php

/*
| Shared helpers for feature tests (loaded from tests/Pest.php).
*/

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * A Better Auth session for the user, as the auth service would write it
 * (App\Support\AuthSessions); returns its token for authAs(). Long-lived by
 * default, so tests that travel in time (trials, grace periods) keep it;
 * expiry itself is tested by passing $expiresAt.
 */
function authSession(int $userId, ?string $token = null, ?DateTimeInterface $expiresAt = null): string
{
    $token ??= Str::random(32);
    DB::table('auth_sessions')->insert([
        'user_id' => $userId,
        'token' => $token,
        'expires_at' => $expiresAt ?? now()->addYear(),
        'ip_address' => '127.0.0.1',
        'user_agent' => 'Pest',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return $token;
}

function makeOwner(string $name = 'Owner'): array
{
    $id = DB::table('users')->insertGetId(['payment_timing' => 'after',
        'name' => $name,
        'restaurant_name' => $name.' Restaurant',
        'email' => Str::lower(Str::random(8)).'@example.test',
        'password' => Hash::make('Secret#123'),
        'role' => 'owner',
        'plan' => 'pro',
        'latitude' => 31.5,
        'longitude' => 34.46,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return ['id' => $id, 'token' => authSession($id)];
}

function makeStaff(int $ownerId, string $role): array
{
    $id = DB::table('users')->insertGetId([
        'name' => ucfirst($role),
        'email' => Str::lower(Str::random(8)).'@staff.test',
        'password' => Hash::make('Secret#123'),
        'role' => $role,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    DB::table('staff')->insert([
        'user_id' => $ownerId,
        'account_user_id' => $id,
        'name' => ucfirst($role),
        'role' => $role,
        'active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return ['id' => $id, 'token' => authSession($id)];
}

function makeTable(int $ownerId, string $label = 'T1'): object
{
    $id = DB::table('restaurant_tables')->insertGetId([
        'user_id' => $ownerId,
        'label' => $label,
        'table_code' => Str::random(24),
        'status' => 'available',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return DB::table('restaurant_tables')->find($id);
}

function makeItem(int $ownerId, float $price = 10, int $prep = 15): int
{
    return DB::table('menu_items')->insertGetId([
        'user_id' => $ownerId,
        'name' => 'Item '.Str::random(4),
        'price' => $price,
        'is_available' => true,
        'prep_time_minutes' => $prep,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

function authAs(array $user): array
{
    return ['Authorization' => 'Bearer '.$user['token'], 'Accept' => 'application/json'];
}

function openSession($test, object $table, string $name = 'Sara'): array
{
    return $test->postJson("/api/public/tables/{$table->table_code}/sessions", [
        'name' => $name,
        'phone' => '0599000000',
        'latitude' => 31.5,
        'longitude' => 34.46,
    ])->json('data');
}

/** Headers a customer's phone sends for its own dining session (session secret). */
function customer(array $session): array
{
    return ['X-Session-Token' => $session['access_token'] ?? '', 'Accept' => 'application/json'];
}
