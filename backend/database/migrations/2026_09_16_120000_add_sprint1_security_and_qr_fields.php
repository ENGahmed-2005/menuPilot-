<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedTinyInteger('login_failed_attempts')->default(0)->after('api_token');
            $table->timestamp('login_locked_until')->nullable()->after('login_failed_attempts');
        });

        Schema::table('restaurant_tables', function (Blueprint $table) {
            $table->text('qr_image_url')->nullable()->after('table_code');
        });
    }

    public function down(): void
    {
        Schema::table('restaurant_tables', function (Blueprint $table) {
            $table->dropColumn('qr_image_url');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['login_failed_attempts', 'login_locked_until']);
        });
    }
};
