<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Customer location shared from the phone (GPS) for delivery orders. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('outside_order_contacts', function (Blueprint $t) {
            if (! Schema::hasColumn('outside_order_contacts', 'latitude')) {
                $t->decimal('latitude', 10, 7)->nullable();
                $t->decimal('longitude', 10, 7)->nullable();
                $t->unsignedInteger('location_accuracy')->nullable(); // metres, as reported by the phone
            }
        });
    }

    public function down(): void
    {
        // Additive only.
    }
};
