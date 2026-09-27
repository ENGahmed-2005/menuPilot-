<?php

namespace Database\Seeders;

use App\Support\AdminAccount;
use Illuminate\Database\Seeder;

/**
 * php artisan db:seed --class=AdminSeeder
 *
 * Reads ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD from the environment (never
 * from the repository). Runs on every deploy, so it is idempotent: it creates
 * the admin once and leaves it alone afterwards. Set ADMIN_RESET_PASSWORD=true
 * for a single deploy to rotate the password, then remove it.
 */
class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = (string) env('ADMIN_EMAIL', '');
        $password = (string) env('ADMIN_PASSWORD', '');

        if ($email === '' || $password === '') {
            $this->command?->warn('AdminSeeder skipped: ADMIN_EMAIL / ADMIN_PASSWORD are not set.');

            return;
        }

        $result = AdminAccount::ensure(
            $email,
            $password,
            (string) env('ADMIN_NAME', 'menuPilot Admin'),
            filter_var(env('ADMIN_RESET_PASSWORD', false), FILTER_VALIDATE_BOOLEAN),
        );

        // Messages never include the password.
        $result['status'] === 'error' ? $this->command?->error($result['message']) : $this->command?->info($result['message']);
    }
}
