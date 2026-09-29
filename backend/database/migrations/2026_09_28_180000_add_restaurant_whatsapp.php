<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Restaurant WhatsApp number in international format (+970599123456) for customers to confirm orders/invoices. */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('online_ordering_settings', 'whatsapp')) {
            Schema::table('online_ordering_settings', fn (Blueprint $t) => $t->string('whatsapp', 20)->nullable());
        }
    }

    public function down(): void
    {
        // Additive only.
    }
};
