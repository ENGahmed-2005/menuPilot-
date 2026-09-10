<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('restaurant_phone', 50)->nullable()->after('restaurant_name');
            $table->text('restaurant_description')->nullable()->after('restaurant_phone');
            $table->string('restaurant_address')->nullable()->after('restaurant_description');
            $table->decimal('latitude', 10, 7)->nullable()->after('restaurant_address');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'restaurant_phone',
                'restaurant_description',
                'restaurant_address',
                'latitude',
                'longitude',
            ]);
        });
    }
};
