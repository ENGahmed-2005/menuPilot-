<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('trial_started_at')->nullable()->after('plan');
            $table->timestamp('trial_ends_at')->nullable()->after('trial_started_at');
            $table->timestamp('subscription_started_at')->nullable()->after('trial_ends_at');
            $table->timestamp('subscription_ends_at')->nullable()->after('subscription_started_at');
        });

        DB::table('users')->where('plan', 'starter')->update(['plan' => 'basic']);
        DB::table('users')->where('plan', 'enterprise')->update(['plan' => 'premium']);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['trial_started_at','trial_ends_at','subscription_started_at','subscription_ends_at']);
        });
    }
};
