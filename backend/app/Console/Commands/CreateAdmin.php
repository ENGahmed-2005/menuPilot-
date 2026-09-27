<?php

namespace App\Console\Commands;

use App\Support\AdminAccount;
use Illuminate\Console\Command;

/**
 * php artisan menupilot:create-admin
 * php artisan menupilot:create-admin --email=ops@example.com --name="Ops"
 * php artisan menupilot:create-admin --email=ops@example.com --reset-password
 *
 * The password is asked interactively (hidden) unless ADMIN_PASSWORD is set;
 * it is never accepted as a command-line option, so it can't end up in shell
 * history or process lists.
 */
class CreateAdmin extends Command
{
    protected $signature = 'menupilot:create-admin
        {--email= : Admin email (defaults to ADMIN_EMAIL)}
        {--name= : Display name (defaults to ADMIN_NAME)}
        {--reset-password : Replace the password of an existing admin}
        {--additional : Allow creating a second admin account}';

    protected $description = 'Create the menuPilot platform admin account (safe to re-run).';

    public function handle(): int
    {
        $email = $this->option('email') ?: config('app.admin.email') ?: $this->ask('Admin email');
        $name = $this->option('name') ?: config('app.admin.name', 'menuPilot Admin');
        $password = config('app.admin.password') ?: $this->secret('Admin password (min 12 characters)');

        $result = AdminAccount::ensure((string) $email, (string) $password, (string) $name, (bool) $this->option('reset-password'), (bool) $this->option('additional'));

        if ($result['status'] === 'error') {
            $this->error($result['message']);

            return self::FAILURE;
        }
        $this->info($result['message']);

        return self::SUCCESS;
    }
}
