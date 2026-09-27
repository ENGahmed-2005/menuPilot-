<?php

/*
| Shared helpers for feature tests (loaded from tests/Pest.php).
*/

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

function makeOwner(string $name = 'Owner'): array
{
    $token = Str::random(40);
    $id = DB::table('users')->insertGetId([
        'name' => $name,
        'restaurant_name' => $name.' Restaurant',
        'email' => Str::lower(Str::random(8)).'@example.test',
        'password' => Hash::make('Secret#123'),
        'role' => 'owner',
        'plan' => 'pro',
        'api_token' => hash('sha256', $token),
        'latitude' => 31.5,
        'longitude' => 34.46,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return ['id' => $id, 'token' => $token];
}

function makeStaff(int $ownerId, string $role): array
{
    $token = Str::random(40);
    $id = DB::table('users')->insertGetId([
        'name' => ucfirst($role),
        'email' => Str::lower(Str::random(8)).'@staff.test',
        'password' => Hash::make('Secret#123'),
        'role' => $role,
        'api_token' => hash('sha256', $token),
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

    return ['id' => $id, 'token' => $token];
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
