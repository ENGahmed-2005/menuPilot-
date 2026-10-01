<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Two plans + paid add-ons (docs/SUBSCRIPTIONS.md).
 *
 *  users.addons            → active add-ons, e.g. ["delivery"]
 *  users.requested_addons  → add-ons chosen with requested_plan, awaiting payment
 *  subscription_payments.addons → what a payment covers
 *
 * The retired Premium plan becomes Pro + delivery + brand_plus: same features,
 * same monthly total (29 + 15 + 5 = 49), same end date. Nothing else changes.
 */
return new class extends Migration
{
    private const PREMIUM_ADDONS = '["delivery","brand_plus"]';

    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            if (! Schema::hasColumn('users', 'addons')) {
                $t->json('addons')->nullable();
            }
            if (! Schema::hasColumn('users', 'requested_addons')) {
                $t->json('requested_addons')->nullable();
            }
        });
        if (! Schema::hasColumn('subscription_payments', 'addons')) {
            Schema::table('subscription_payments', fn (Blueprint $t) => $t->json('addons')->nullable());
        }

        DB::table('users')->where('role', 'owner')->where('plan', 'premium')
            ->update(['plan' => 'pro', 'addons' => self::PREMIUM_ADDONS]);
        // Staff rows only mirror their owner's plan name.
        DB::table('users')->where('plan', 'premium')->update(['plan' => 'pro']);
        DB::table('users')->where('requested_plan', 'premium')
            ->update(['requested_plan' => 'pro', 'requested_addons' => self::PREMIUM_ADDONS]);
        DB::table('subscription_payments')->where('plan', 'premium')
            ->update(['plan' => 'pro', 'addons' => self::PREMIUM_ADDONS]);
    }

    public function down(): void
    {
        // Pro with both add-ons was Premium; any other add-on choice has no
        // three-plan equivalent and falls back to its plan.
        $both = fn ($q, string $column) => $q->whereJsonContains($column, 'delivery')->whereJsonContains($column, 'brand_plus');
        $both(DB::table('users')->where('role', 'owner')->where('plan', 'pro'), 'addons')->update(['plan' => 'premium']);
        $both(DB::table('users')->where('requested_plan', 'pro'), 'requested_addons')->update(['requested_plan' => 'premium']);
        $both(DB::table('subscription_payments')->where('plan', 'pro'), 'addons')->update(['plan' => 'premium']);

        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['addons', 'requested_addons']));
        Schema::table('subscription_payments', fn (Blueprint $t) => $t->dropColumn('addons'));
    }
};
