<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

/**
 * Creates the platform admin safely. Shared by AdminSeeder (deploys) and the
 * `menupilot:create-admin` command (manual setup).
 *
 *  - never creates a second admin when one already exists;
 *  - never turns an existing owner/staff account into an admin;
 *  - only changes an existing admin's password when explicitly asked;
 *  - the password is hashed and never returned or logged.
 */
class AdminAccount
{
    /** @return array{status: string, message: string} */
    public static function ensure(string $email, string $password, string $name = 'menuPilot Admin', bool $resetPassword = false, bool $allowAdditional = false): array
    {
        $email = strtolower(trim($email));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['status' => 'error', 'message' => 'ADMIN_EMAIL is not a valid email address.'];
        }
        $existing = User::whereRaw('LOWER(email) = ?', [$email])->first();
        if ($existing && $existing->role !== 'admin') {
            return ['status' => 'error', 'message' => "The email {$email} belongs to a non-admin account; refusing to promote it."];
        }

        if ($existing && ! $resetPassword) {
            return ['status' => 'unchanged', 'message' => "Admin {$email} already exists; nothing changed."];
        }
        // Length is only enforced when a password is actually being set.
        if (strlen($password) < 12) {
            return ['status' => 'error', 'message' => 'ADMIN_PASSWORD must be at least 12 characters.'];
        }

        if ($existing) {
            $existing->forceFill([
                'password' => Hash::make($password),
                'api_token' => null, // sign out existing sessions
                'login_failed_attempts' => 0,
                'login_locked_until' => null,
                'is_active' => true,
            ])->save();

            return ['status' => 'updated', 'message' => "Password reset for admin {$email}."];
        }

        if (! $allowAdditional && User::where('role', 'admin')->exists()) {
            return ['status' => 'unchanged', 'message' => 'An admin account already exists; no second admin was created.'];
        }

        User::create([
            'name' => $name,
            'restaurant_name' => 'menuPilot',
            'email' => $email,
            'password' => Hash::make($password),
            'role' => 'admin',
            'plan' => 'premium',
            'is_active' => true,
        ]);

        return ['status' => 'created', 'message' => "Admin {$email} created."];
    }
}
