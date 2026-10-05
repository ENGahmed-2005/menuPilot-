<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Who closed a dining session (cashier, owner, or table-status change). */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('dining_sessions', 'closed_by')) {
            Schema::table('dining_sessions', fn (Blueprint $t) => $t->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete());
        }
    }

    public function down(): void
    {
        // Additive only.
    }
};
