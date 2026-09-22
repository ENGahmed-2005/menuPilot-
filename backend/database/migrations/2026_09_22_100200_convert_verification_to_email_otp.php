<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('email_otp_hash', 64)->nullable()->after('email_verified_at');
            $table->timestamp('email_otp_expires_at')->nullable()->after('email_otp_hash');
            $table->timestamp('email_otp_sent_at')->nullable()->after('email_otp_expires_at');
            $table->unsignedTinyInteger('email_otp_attempts')->default(0)->after('email_otp_sent_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['whatsapp_phone']);
            $table->dropColumn(['whatsapp_phone', 'whatsapp_verified_at', 'verification_required']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('whatsapp_phone', 20)->nullable()->after('email');
            $table->timestamp('whatsapp_verified_at')->nullable()->after('email_verified_at');
            $table->boolean('verification_required')->default(false)->after('whatsapp_verified_at');
            $table->index('whatsapp_phone');
            $table->dropColumn(['email_otp_hash', 'email_otp_expires_at', 'email_otp_sent_at', 'email_otp_attempts']);
        });
    }
};
