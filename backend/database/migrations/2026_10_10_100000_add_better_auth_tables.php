<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Better Auth (the auth/ service) on the existing database.
 *
 * Laravel stays the only one that migrates: the auth service maps its models
 * onto these tables and never creates any. "users" IS Better Auth's user
 * model (its numeric id is read as a string); the other tables mirror Better
 * Auth 1.7.7's core schema and its two-factor plugin, snake_case, with the
 * 32-character string ids Better Auth generates (an id known before the
 * insert: MySQL has no RETURNING, and reading LAST_INSERT_ID() back on a
 * pooled connection could pick another request's row).
 *
 *  - users.email_verified     true for every existing account (grandfathered)
 *  - users.image              avatar (Google)
 *  - users.two_factor_enabled two-factor plugin flag
 *  - auth_sessions / auth_accounts / auth_verifications / auth_two_factors /
 *    auth_rate_limits
 *  - one "credential" auth_accounts row per existing password, so everyone
 *    keeps signing in with the password they have today.
 *
 * Additive and guarded, safe to run on the existing MySQL database.
 */
return new class extends Migration
{
    public function up(): void
    {
        $this->addUserColumns();
        $this->createAuthTables();
        $this->backfill();
    }

    public function down(): void
    {
        foreach (['auth_rate_limits', 'auth_two_factors', 'auth_verifications', 'auth_accounts', 'auth_sessions'] as $table) {
            Schema::dropIfExists($table);
        }
        foreach (['two_factor_enabled', 'image', 'email_verified'] as $column) {
            if (Schema::hasColumn('users', $column)) {
                Schema::table('users', fn (Blueprint $t) => $t->dropColumn($column));
            }
        }
    }

    private function addUserColumns(): void
    {
        if (! Schema::hasColumn('users', 'email_verified')) {
            Schema::table('users', fn (Blueprint $t) => $t->boolean('email_verified')->default(false));
            // Accounts that exist today were never asked to verify: keep them signing in.
            DB::table('users')->update(['email_verified' => true]);
        }
        if (! Schema::hasColumn('users', 'image')) {
            Schema::table('users', fn (Blueprint $t) => $t->string('image', 255)->nullable());
        }
        if (! Schema::hasColumn('users', 'two_factor_enabled')) {
            Schema::table('users', fn (Blueprint $t) => $t->boolean('two_factor_enabled')->default(false));
        }
    }

    private function createAuthTables(): void
    {
        if (! Schema::hasTable('auth_sessions')) {
            Schema::create('auth_sessions', function (Blueprint $t) {
                $t->string('id', 36)->primary();
                $t->foreignId('user_id')->index()->constrained('users')->cascadeOnDelete();
                $t->string('token', 255)->unique();
                $t->dateTime('expires_at');
                $t->string('ip_address', 45)->nullable();
                $t->text('user_agent')->nullable();
                $t->dateTime('created_at')->useCurrent();
                $t->dateTime('updated_at')->useCurrent();
            });
        }

        if (! Schema::hasTable('auth_accounts')) {
            Schema::create('auth_accounts', function (Blueprint $t) {
                $t->string('id', 36)->primary();
                $t->foreignId('user_id')->index()->constrained('users')->cascadeOnDelete();
                $t->string('account_id', 255);
                $t->string('provider_id', 255);
                $t->text('access_token')->nullable();
                $t->text('refresh_token')->nullable();
                $t->text('id_token')->nullable();
                $t->dateTime('access_token_expires_at')->nullable();
                $t->dateTime('refresh_token_expires_at')->nullable();
                $t->text('scope')->nullable();
                $t->string('password', 255)->nullable();
                $t->dateTime('created_at')->useCurrent();
                $t->dateTime('updated_at')->useCurrent();
                $t->unique(['provider_id', 'account_id']);
            });
        }

        if (! Schema::hasTable('auth_verifications')) {
            Schema::create('auth_verifications', function (Blueprint $t) {
                $t->string('id', 36)->primary();
                $t->string('identifier', 255)->index();
                $t->text('value');
                $t->dateTime('expires_at');
                $t->dateTime('created_at')->useCurrent();
                $t->dateTime('updated_at')->useCurrent();
            });
        }

        // Better Auth 1.7.7 two-factor plugin schema: no timestamps.
        if (! Schema::hasTable('auth_two_factors')) {
            Schema::create('auth_two_factors', function (Blueprint $t) {
                $t->string('id', 36)->primary();
                $t->foreignId('user_id')->index()->constrained('users')->cascadeOnDelete();
                $t->text('secret');
                $t->text('backup_codes');
                $t->boolean('verified')->default(true);
                $t->integer('failed_verification_count')->default(0);
                $t->dateTime('locked_until')->nullable();
            });
        }

        if (! Schema::hasTable('auth_rate_limits')) {
            Schema::create('auth_rate_limits', function (Blueprint $t) {
                $t->string('id', 36)->primary();
                $t->string('key', 255)->unique();
                $t->integer('count');
                $t->bigInteger('last_request'); // ms since epoch
            });
        }
    }

    private function backfill(): void
    {
        // Better Auth requires both timestamps on its user model.
        DB::table('users')->whereNull('created_at')->update(['created_at' => now()]);
        DB::table('users')->whereNull('updated_at')->update(['updated_at' => DB::raw('created_at')]);

        // Better Auth looks e-mails up lower-cased; normalise where it can't collide.
        DB::table('users')->orderBy('id')->select(['id', 'email'])->each(function ($user) {
            $lower = strtolower(trim((string) $user->email));
            if ($lower !== $user->email && ! DB::table('users')->where('id', '!=', $user->id)->whereRaw('LOWER(email) = ?', [$lower])->exists()) {
                DB::table('users')->where('id', $user->id)->update(['email' => $lower]);
            }
        });

        // One credential account per existing password (idempotent: unique provider_id + account_id).
        $now = now();
        DB::table('users')->whereNotNull('password')->where('password', '!=', '')->select(['id', 'password'])
            ->chunkById(500, function ($users) use ($now) {
                DB::table('auth_accounts')->insertOrIgnore($users->map(fn ($u) => [
                    'id' => Str::random(32),
                    'user_id' => $u->id,
                    'account_id' => (string) $u->id,
                    'provider_id' => 'credential',
                    'password' => $u->password,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])->all());
            });
    }
};
