<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Dish extras («الإضافات», App\Support\MenuOptions): the owner's list on
 * each dish, and the snapshot of the extras a guest chose on each order line.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['menu_items', 'order_items'] as $table) {
            if (! Schema::hasColumn($table, 'options')) {
                Schema::table($table, fn (Blueprint $t) => $t->json('options')->nullable());
            }
        }
    }

    public function down(): void
    {
        foreach (['menu_items', 'order_items'] as $table) {
            if (Schema::hasColumn($table, 'options')) {
                Schema::table($table, fn (Blueprint $t) => $t->dropColumn('options'));
            }
        }
    }
};
