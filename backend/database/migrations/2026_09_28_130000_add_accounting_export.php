<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Accounting export (docs/ACCOUNTING_EXPORT.md).
 *  - accounting_settings: per-restaurant profile, currency, invoice prefix,
 *    tax settings, account codes and column mapping (all configurable).
 *  - dining_sessions.invoice_number: stable, sequential per restaurant,
 *    issued when the session closes (the invoice is final). Existing closed
 *    sessions are numbered in closing order.
 *  - menu_items.sku: product code for accounting.
 *  - indexes for date / restaurant / payment filtering.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('accounting_settings')) {
            Schema::create('accounting_settings', function (Blueprint $t) {
                $t->id();
                $t->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete(); // restaurant owner
                $t->string('profile', 30)->default('generic');
                $t->string('currency', 10)->default('ILS');
                $t->string('invoice_prefix', 20)->default('INV-');
                $t->decimal('tax_rate', 5, 2)->default(0);
                $t->boolean('prices_include_tax')->default(true);
                $t->json('accounts')->nullable();          // sales, cash, bank, electronic, tax, discount, customer
                $t->json('category_accounts')->nullable(); // {"<category>": "<account code>"}
                $t->json('column_mapping')->nullable();    // {"<export>": {"<field>": "<header>" | false}}
                $t->timestamps();
            });
        }

        Schema::table('dining_sessions', function (Blueprint $t) {
            if (! Schema::hasColumn('dining_sessions', 'restaurant_id')) {
                $t->unsignedBigInteger('restaurant_id')->nullable();
            }
            if (! Schema::hasColumn('dining_sessions', 'invoice_number')) {
                $t->unsignedInteger('invoice_number')->nullable();
            }
            if (! Schema::hasColumn('dining_sessions', 'invoiced_at')) {
                $t->timestamp('invoiced_at')->nullable();
            }
        });
        $this->index('dining_sessions', ['restaurant_id', 'invoice_number'], 'dining_sessions_invoice_unique', true);
        $this->index('dining_sessions', ['closed_at'], 'dining_sessions_closed_at_index');

        if (! Schema::hasColumn('menu_items', 'sku')) {
            Schema::table('menu_items', fn (Blueprint $t) => $t->string('sku', 64)->nullable());
        }
        $this->index('payments', ['dining_session_id', 'status'], 'payments_session_status_index');
        $this->index('payments', ['created_at'], 'payments_created_at_index');
        $this->index('orders', ['submitted_at'], 'orders_submitted_at_index');

        // Number existing closed sessions per restaurant, in closing order.
        $rows = DB::table('dining_sessions')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->whereNotNull('dining_sessions.closed_at')->whereNull('dining_sessions.invoice_number')
            ->orderBy('restaurant_tables.user_id')->orderBy('dining_sessions.closed_at')->orderBy('dining_sessions.id')
            ->select('dining_sessions.id', 'dining_sessions.closed_at', 'restaurant_tables.user_id as restaurant_id')
            ->get();
        $next = [];
        foreach ($rows as $row) {
            $next[$row->restaurant_id] ??= (int) DB::table('dining_sessions')->where('restaurant_id', $row->restaurant_id)->max('invoice_number');
            DB::table('dining_sessions')->where('id', $row->id)->update([
                'restaurant_id' => $row->restaurant_id,
                'invoice_number' => ++$next[$row->restaurant_id],
                'invoiced_at' => $row->closed_at,
            ]);
        }
    }

    public function down(): void
    {
        // Additive only.
    }

    private function index(string $table, array $columns, string $name, bool $unique = false): void
    {
        if (Schema::hasIndex($table, $name)) {
            return;
        }
        Schema::table($table, fn (Blueprint $t) => $unique ? $t->unique($columns, $name) : $t->index($columns, $name));
    }
};
