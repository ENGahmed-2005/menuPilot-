<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Owner "forgot password" requests handled by the platform admin (link sent on WhatsApp). */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('password_reset_requests')) {
            Schema::create('password_reset_requests', function (Blueprint $t) {
                $t->id();
                $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $t->string('status', 20)->default('pending'); // pending | sent | dismissed
                $t->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
                $t->timestamp('handled_at')->nullable();
                $t->string('ip', 45)->nullable();
                $t->timestamps();
                $t->index(['status', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_requests');
    }
};
