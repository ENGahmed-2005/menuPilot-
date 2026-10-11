<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * The Better Auth "credential" account of a user (auth_accounts row with
 * provider_id "credential", account_id = the user id as a string).
 *
 * users.password stays the canonical bcrypt hash. Whenever Laravel sets one
 * (registration, staff created or changed by the owner, admin-created owners,
 * the admin's WhatsApp reset link) the copy is written here too, so password
 * sign-in, change-password and the Security page agree immediately. The auth
 * service also re-syncs it on every password sign-in.
 */
class CredentialAccount
{
    public static function sync(int $userId, string $passwordHash): void
    {
        $now = now();
        $key = ['provider_id' => 'credential', 'account_id' => (string) $userId];

        if (DB::table('auth_accounts')->where($key)->exists()) {
            DB::table('auth_accounts')->where($key)->update(['user_id' => $userId, 'password' => $passwordHash, 'updated_at' => $now]);

            return;
        }
        DB::table('auth_accounts')->insert($key + ['id' => Str::random(32), 'user_id' => $userId, 'password' => $passwordHash, 'created_at' => $now, 'updated_at' => $now]);
    }
}
