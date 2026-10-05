<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Restaurant permissions set by the platform admin (App\Support\RestaurantFeatures):
 * {"grant": [...], "revoke": [...]} on top of the plan; null = the plan's defaults.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'feature_overrides')) {
            Schema::table('users', fn (Blueprint $t) => $t->json('feature_overrides')->nullable());
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'feature_overrides')) {
            Schema::table('users', fn (Blueprint $t) => $t->dropColumn('feature_overrides'));
        }
    }
};
