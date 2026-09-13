<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Create or update the development admin account.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@menupilot.test'],
            [
                'name' => 'MenuPilot Admin',
                'password' => Hash::make('Admin@12345'),
                'role' => 'admin',
                'plan' => 'premium',
            ]
        );
    }
}
