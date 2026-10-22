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
        Schema::create('google_registrations', function (Blueprint $table) {
            $table->string('token_hash', 64)->primary();
            $table->string('email');
            $table->string('subject');
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->dateTime('expires_at')->index();
            $table->dateTime('created_at');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->string('restaurant_type', 32)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('google_registrations');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('restaurant_type'));
    }
};
