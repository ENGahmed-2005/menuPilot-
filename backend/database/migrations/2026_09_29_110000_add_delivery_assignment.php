<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Delivery order → assigned driver (a staff user with the delivery role). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            if (! Schema::hasColumn('orders', 'assigned_driver_id')) {
                $t->foreignId('assigned_driver_id')->nullable()->constrained('users')->nullOnDelete();
                $t->timestamp('assigned_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        // Additive only.
    }
};
