<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');

        if (!$email || !$password) {
            return;
        }

        User::updateOrCreate(
            ['email' => $email],
            [
                'name' => 'MenuPilot Admin',
                'restaurant_name' => 'MenuPilot Admin',
                'password' => Hash::make($password),
                'role' => 'admin',
                'plan' => 'premium',
                'login_failed_attempts' => 0,
                'login_locked_until' => null,
            ]
        );
    }
}
