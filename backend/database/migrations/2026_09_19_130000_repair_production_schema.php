<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            $columns = [
                'restaurant_name' => fn (Blueprint $t) => $t->string('restaurant_name')->nullable(),
                'plan' => fn (Blueprint $t) => $t->string('plan')->default('starter'),
                'role' => fn (Blueprint $t) => $t->string('role')->default('owner'),
                'api_token' => fn (Blueprint $t) => $t->string('api_token', 80)->nullable(),
                'theme' => fn (Blueprint $t) => $t->json('theme')->nullable(),
                'login_failed_attempts' => fn (Blueprint $t) => $t->unsignedTinyInteger('login_failed_attempts')->default(0),
                'login_locked_until' => fn (Blueprint $t) => $t->timestamp('login_locked_until')->nullable(),
                'restaurant_phone' => fn (Blueprint $t) => $t->string('restaurant_phone')->nullable(),
                'restaurant_description' => fn (Blueprint $t) => $t->text('restaurant_description')->nullable(),
                'restaurant_address' => fn (Blueprint $t) => $t->string('restaurant_address')->nullable(),
                'latitude' => fn (Blueprint $t) => $t->decimal('latitude', 10, 7)->nullable(),
                'longitude' => fn (Blueprint $t) => $t->decimal('longitude', 10, 7)->nullable(),
                'payment_methods' => fn (Blueprint $t) => $t->json('payment_methods')->nullable(),
                'trial_started_at' => fn (Blueprint $t) => $t->timestamp('trial_started_at')->nullable(),
                'trial_ends_at' => fn (Blueprint $t) => $t->timestamp('trial_ends_at')->nullable(),
                'subscription_started_at' => fn (Blueprint $t) => $t->timestamp('subscription_started_at')->nullable(),
                'subscription_ends_at' => fn (Blueprint $t) => $t->timestamp('subscription_ends_at')->nullable(),
            ];
            foreach ($columns as $name => $definition) {
                if (!Schema::hasColumn('users', $name)) {
                    Schema::table('users', $definition);
                }
            }
        }

        if (Schema::hasTable('staff')) {
            if (!Schema::hasColumn('staff', 'account_user_id')) {
                Schema::table('staff', function (Blueprint $table) {
                    $table->foreignId('account_user_id')->nullable()->constrained('users')->nullOnDelete();
                });
            }
            if (!Schema::hasColumn('staff', 'active')) {
                Schema::table('staff', function (Blueprint $table) {
                    $table->boolean('active')->default(true);
                });
            }
        }

        if (Schema::hasTable('menu_items') && !Schema::hasColumn('menu_items', 'deleted_at')) {
            Schema::table('menu_items', function (Blueprint $table) {
                $table->timestamp('deleted_at')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        // Intentionally non-destructive.
    }
};
