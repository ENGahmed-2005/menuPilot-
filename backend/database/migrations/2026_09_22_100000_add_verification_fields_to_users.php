<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('whatsapp_phone', 20)->nullable()->after('email');
            $table->timestamp('whatsapp_verified_at')->nullable()->after('email_verified_at');
            $table->boolean('verification_required')->default(false)->after('whatsapp_verified_at');
            $table->index('whatsapp_phone');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['whatsapp_phone']);
            $table->dropColumn(['whatsapp_phone', 'whatsapp_verified_at', 'verification_required']);
        });
    }
};