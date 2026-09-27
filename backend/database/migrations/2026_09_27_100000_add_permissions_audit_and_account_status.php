<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Permissions, account status and audit trail.
 *  - users.is_active      admin can disable an owner (and with it their staff)
 *  - users.last_active_at shown in staff management
 *  - staff.phone / staff.permissions (JSON, null = role defaults)
 *  - audit_logs           who did what to which record
 * Additive and guarded, safe to run on the existing MySQL database.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'is_active')) {
            Schema::table('users', fn (Blueprint $t) => $t->boolean('is_active')->default(true));
        }
        if (! Schema::hasColumn('users', 'last_active_at')) {
            Schema::table('users', fn (Blueprint $t) => $t->timestamp('last_active_at')->nullable());
        }
        if (! Schema::hasColumn('staff', 'phone')) {
            Schema::table('staff', fn (Blueprint $t) => $t->string('phone', 30)->nullable());
        }
        if (! Schema::hasColumn('staff', 'permissions')) {
            Schema::table('staff', fn (Blueprint $t) => $t->json('permissions')->nullable());
        }

        if (! Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $t) {
                $t->id();
                $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $t->unsignedBigInteger('restaurant_id')->nullable()->index(); // owner user id; null = platform action
                $t->string('action', 60)->index();
                $t->string('entity_type', 40);
                $t->unsignedBigInteger('entity_id')->nullable();
                $t->json('metadata')->nullable();
                $t->string('ip_address', 45)->nullable();
                $t->timestamp('created_at')->useCurrent()->index();
                $t->index(['entity_type', 'entity_id']);
            });
        }
    }

    public function down(): void
    {
        // Non-destructive by design (matches the production repair strategy).
    }
};
