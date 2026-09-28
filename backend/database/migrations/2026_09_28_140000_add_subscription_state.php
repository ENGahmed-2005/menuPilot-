<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Subscription state on the owner account (the project's existing model:
 * plan + trial_* + subscription_* columns on users).
 *  - subscription_status: last computed state (TRIAL/ACTIVE/EXPIRED/CANCELLED),
 *    always recomputed server-side from the dates; stored for admin lists/indexes
 *  - subscription_cancelled_at, requested_plan / plan_requested_at (owner asks,
 *    admin activates after payment), subscription_notices (milestones sent)
 * Also repairs accounts hit by the old refreshSubscriptionStatus() bug, which
 * turned every expired trial into a free 'basic' plan: paid plan + expired
 * trial + never subscribed ⇒ back to an (expired) trial.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            foreach ([
                'subscription_status' => fn () => $t->string('subscription_status', 20)->nullable(),
                'subscription_cancelled_at' => fn () => $t->timestamp('subscription_cancelled_at')->nullable(),
                'requested_plan' => fn () => $t->string('requested_plan', 20)->nullable(),
                'plan_requested_at' => fn () => $t->timestamp('plan_requested_at')->nullable(),
                'subscription_notices' => fn () => $t->json('subscription_notices')->nullable(),
            ] as $column => $add) {
                if (! Schema::hasColumn('users', $column)) {
                    $add();
                }
            }
        });
        foreach ([['subscription_status'], ['trial_ends_at']] as $cols) {
            $name = 'users_'.implode('_', $cols).'_index';
            if (! Schema::hasIndex('users', $name)) {
                Schema::table('users', fn (Blueprint $t) => $t->index($cols, $name));
            }
        }

        DB::table('users')->where('role', 'owner')->whereIn('plan', ['basic', 'pro', 'premium'])
            ->whereNull('subscription_started_at')->whereNotNull('trial_ends_at')->where('trial_ends_at', '<', now())
            ->update(['plan' => 'trial']);
    }

    public function down(): void
    {
        // Additive only.
    }
};
