<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** How the customer menu looks: layout, header, logo shape… (App\Support\MenuStyle). */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('restaurant_settings', 'menu_style')) {
            Schema::table('restaurant_settings', fn (Blueprint $t) => $t->json('menu_style')->nullable());
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('restaurant_settings', 'menu_style')) {
            Schema::table('restaurant_settings', fn (Blueprint $t) => $t->dropColumn('menu_style'));
        }
    }
};
