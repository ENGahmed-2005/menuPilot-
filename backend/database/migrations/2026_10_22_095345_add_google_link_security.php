<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('auth_accounts', function (Blueprint $table) {
            $table->string('google_email')->nullable();
        });
        Schema::create('auth_google_proofs', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('session_id', 36);
            $table->string('security_hash', 64);
            $table->foreign('session_id')->references('id')->on('auth_sessions')->cascadeOnDelete();
            $table->string('action', 16);
            $table->string('stage', 16);
            $table->string('target_id', 36)->nullable();
            $table->string('google_subject')->nullable();
            $table->dateTime('expires_at')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('auth_google_proofs');
        Schema::table('auth_accounts', fn (Blueprint $table) => $table->dropColumn('google_email'));
    }
};
