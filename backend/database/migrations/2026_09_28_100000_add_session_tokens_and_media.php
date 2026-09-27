<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Launch hardening.
 *  - dining_sessions.access_token: random secret given to the customer's
 *    phone when the session opens; public session endpoints require it
 *    (session ids are sequential and were guessable).
 *  - media: uploaded images live in the database, because the container
 *    filesystem on Render is wiped on every deploy.
 *  - QR image URLs that were stored with the backend host are cleared so
 *    they are regenerated with FRONTEND_URL.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('dining_sessions', 'access_token')) {
            Schema::table('dining_sessions', fn (Blueprint $t) => $t->string('access_token', 64)->nullable()->index());
        }

        if (! Schema::hasTable('media')) {
            Schema::create('media', function (Blueprint $t) {
                $t->id();
                $t->uuid('uuid')->unique();
                $t->unsignedBigInteger('user_id')->nullable()->index();
                $t->string('mime', 60);
                $t->unsignedInteger('size');
                $t->longText('data'); // base64; portable across MySQL / SQLite
                $t->timestamps();
            });
        }

        if (Schema::hasColumn('restaurant_tables', 'qr_image_url')) {
            DB::table('restaurant_tables')->where('qr_image_url', 'like', 'https://api.qrserver.com/%')->update(['qr_image_url' => null]);
        }
    }

    public function down(): void
    {
        // Additive only.
    }
};
