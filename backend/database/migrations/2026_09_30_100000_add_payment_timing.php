<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * When dine-in guests pay: 'before' (pay first — the order reaches the
 * kitchen only after the cashier confirms payment; the current behaviour and
 * default) or 'after' (the order goes to the kitchen at once; the guest pays
 * at the end through the bill).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'payment_timing')) {
            Schema::table('users', fn (Blueprint $t) => $t->string('payment_timing', 10)->default('before'));
        }
    }

    public function down(): void
    {
        // Additive only.
    }
};
