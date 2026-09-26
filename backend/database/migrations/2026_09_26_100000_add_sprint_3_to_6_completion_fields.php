<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sprint 3–6 completion (US-10, US-11, US-13, US-14, US-17, US-18, US-19, US-20).
 *
 * Every change is guarded with hasTable/hasColumn so the migration is safe to
 * run against the production database that was repaired in 2026_09_19.
 */
return new class extends Migration
{
    public function up(): void
    {
        // US-10: sequential order number per restaurant. US-13: per-status timestamps.
        $this->addColumns('orders', [
            'order_number' => fn (Blueprint $t) => $t->unsignedInteger('order_number')->nullable(),
            'preparing_at' => fn (Blueprint $t) => $t->timestamp('preparing_at')->nullable(),
            'served_at' => fn (Blueprint $t) => $t->timestamp('served_at')->nullable(),
        ]);

        // US-19 / US-20: cancellation audit + reassignment link.
        $this->addColumns('order_items', [
            'cancelled_by' => fn (Blueprint $t) => $t->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete(),
            'cancelled_at' => fn (Blueprint $t) => $t->timestamp('cancelled_at')->nullable(),
            'reassigned_from_item_id' => fn (Blueprint $t) => $t->foreignId('reassigned_from_item_id')->nullable()->constrained('order_items')->nullOnDelete(),
        ]);

        // US-11: optional note + pending/resolved lifecycle for waiter calls.
        $this->addColumns('assistance_requests', [
            'note' => fn (Blueprint $t) => $t->string('note', 255)->nullable(),
            'resolved_at' => fn (Blueprint $t) => $t->timestamp('resolved_at')->nullable(),
            'resolved_by' => fn (Blueprint $t) => $t->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete(),
        ]);

        // US-14: expected preparation time per menu item.
        $this->addColumns('menu_items', [
            'prep_time_minutes' => fn (Blueprint $t) => $t->unsignedSmallInteger('prep_time_minutes')->default(15),
        ]);

        // US-17 / US-18: who recorded a payment and whether it awaits reconciliation.
        $this->addColumns('payments', [
            'recorded_by' => fn (Blueprint $t) => $t->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete(),
            'reconciliation_status' => fn (Blueprint $t) => $t->string('reconciliation_status', 40)->nullable(),
        ]);

        // US-13 / FR-23: audit-friendly, timestamped status history.
        if (! Schema::hasTable('order_status_histories')) {
            Schema::create('order_status_histories', function (Blueprint $t) {
                $t->id();
                $t->foreignId('order_id')->constrained()->cascadeOnDelete();
                $t->string('from_status', 40)->nullable();
                $t->string('to_status', 40);
                $t->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
                $t->timestamp('created_at')->useCurrent();
                $t->index(['order_id', 'created_at']);
            });
        }

        // US-18 / FR-36: manual bill adjustments audit (was referenced by code but never created).
        if (! Schema::hasTable('bill_adjustments')) {
            Schema::create('bill_adjustments', function (Blueprint $t) {
                $t->id();
                $t->foreignId('dining_session_id')->constrained()->cascadeOnDelete();
                $t->foreignId('order_item_id')->constrained()->cascadeOnDelete();
                $t->decimal('old_price', 10, 2);
                $t->decimal('new_price', 10, 2);
                $t->string('reason', 255)->nullable();
                $t->foreignId('cashier_id')->nullable()->constrained('users')->nullOnDelete();
                $t->timestamps();
            });
        }
    }

    public function down(): void
    {
        // Intentionally non-destructive, matching the production repair strategy.
    }

    private function addColumns(string $table, array $columns): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }
        foreach ($columns as $name => $definition) {
            if (! Schema::hasColumn($table, $name)) {
                Schema::table($table, $definition);
            }
        }
    }
};
