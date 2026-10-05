<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Demo restaurants and their staff (App\Support\DemoRestaurant). */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'is_demo')) {
            Schema::table('users', fn (Blueprint $t) => $t->boolean('is_demo')->default(false)->index());
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'is_demo')) {
            Schema::table('users', fn (Blueprint $t) => $t->dropColumn('is_demo'));
        }
    }
};
