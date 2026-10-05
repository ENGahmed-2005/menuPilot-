<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ordering from outside the restaurant (pickup / delivery), Premium plan.
 * Outside orders live in the same orders table (channel ≠ dine_in), so the
 * kitchen, owner orders and reports see them without duplicated logic; they
 * simply have no dining session.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            $t->foreignId('dining_session_id')->nullable()->change();
        });
        Schema::table('orders', function (Blueprint $t) {
            $add = fn (string $c, callable $f) => Schema::hasColumn('orders', $c) ? null : $f();
            $add('channel', fn () => $t->string('channel', 20)->default('dine_in'));
            $add('fulfillment_status', fn () => $t->string('fulfillment_status', 30)->nullable()); // awaiting_acceptance|accepted|rejected|out_for_delivery|completed
            $add('delivery_fee', fn () => $t->decimal('delivery_fee', 10, 2)->default(0));
            $add('payment_method', fn () => $t->string('payment_method', 20)->nullable());      // cash|transfer (outside orders)
            $add('payment_status', fn () => $t->string('payment_status', 30)->nullable());      // unpaid|pending_verification|paid
            $add('payment_proof_url', fn () => $t->string('payment_proof_url', 255)->nullable());
            $add('public_token', fn () => $t->string('public_token', 48)->nullable()->index());
            $add('prep_minutes', fn () => $t->unsignedSmallInteger('prep_minutes')->nullable());
            $add('rejection_reason', fn () => $t->string('rejection_reason', 255)->nullable());
            $add('accepted_at', fn () => $t->timestamp('accepted_at')->nullable());
            $add('dispatched_at', fn () => $t->timestamp('dispatched_at')->nullable());
            $add('completed_at', fn () => $t->timestamp('completed_at')->nullable());
        });
        if (! Schema::hasIndex('orders', 'orders_user_channel_status_index')) {
            Schema::table('orders', fn (Blueprint $t) => $t->index(['user_id', 'channel', 'fulfillment_status'], 'orders_user_channel_status_index'));
        }

        if (! Schema::hasTable('outside_order_contacts')) {
            Schema::create('outside_order_contacts', function (Blueprint $t) {
                $t->id();
                $t->foreignId('order_id')->unique()->constrained('orders')->cascadeOnDelete();
                $t->string('name', 120);
                $t->string('phone', 30)->index();
                $t->string('address', 500)->nullable();
                $t->unsignedBigInteger('zone_id')->nullable();
                $t->string('zone_name', 120)->nullable();
                $t->string('notes', 500)->nullable();
                $t->timestamps();
            });
        }
        if (! Schema::hasTable('delivery_zones')) {
            Schema::create('delivery_zones', function (Blueprint $t) {
                $t->id();
                $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $t->string('name', 120);
                $t->decimal('fee', 10, 2)->default(0);
                $t->decimal('min_order', 10, 2)->default(0);
                $t->boolean('active')->default(true);
                $t->timestamps();
            });
        }
        if (! Schema::hasTable('online_ordering_settings')) {
            Schema::create('online_ordering_settings', function (Blueprint $t) {
                $t->id();
                $t->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
                $t->string('slug', 80)->unique();
                $t->boolean('enabled')->default(false);
                $t->boolean('paused')->default(false);
                $t->boolean('pickup_enabled')->default(true);
                $t->boolean('delivery_enabled')->default(false);
                $t->unsignedSmallInteger('prep_minutes')->default(20);
                $t->string('opens_at', 5)->nullable();  // HH:MM, restaurant time; null = always
                $t->string('closes_at', 5)->nullable();
                $t->timestamps();
            });
        }
    }

    public function down(): void
    {
        // Additive only.
    }
};
