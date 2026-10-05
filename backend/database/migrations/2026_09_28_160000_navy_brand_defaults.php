<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Brand palette is navy + orange (green is no longer part of the identity).
 * Restaurants that never changed their menu colours still hold the old
 * defaults; move exactly those values to the new defaults. Custom colours
 * chosen by an owner are left untouched.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('restaurant_settings')) {
            return;
        }
        DB::table('restaurant_settings')->whereIn('secondary_color', ['#5B7A52', '#5b7a52'])->update(['secondary_color' => '#4B6A8A']);
        DB::table('restaurant_settings')->where('text_color', '#171717')->update(['text_color' => '#172331']);
        DB::table('restaurant_settings')->where('button_color', '#171717')->update(['button_color' => '#1F2D3D']);
    }

    public function down(): void
    {
        // Colour data only; nothing to reverse.
    }
};
