<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Subscription payments reported by owners (bank transfer to Bank of
 * Palestine) and verified by the platform admin. Verification activates the
 * plan for the paid months; nothing is charged automatically.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('subscription_payments')) {
            return;
        }
        Schema::create('subscription_payments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->constrained('users')->cascadeOnDelete(); // restaurant owner
            $t->string('invoice_number', 30)->nullable()->unique();
            $t->string('plan', 20);
            $t->unsignedTinyInteger('months')->default(1);
            $t->decimal('amount', 10, 2);
            $t->string('currency', 10);
            $t->string('method', 30)->default('bank_transfer');
            $t->string('bank', 60)->nullable();
            $t->string('reference_code', 40);          // what the owner writes in the transfer note
            $t->string('transfer_reference', 80)->nullable(); // bank's transaction number
            $t->string('payer_name', 120)->nullable();
            $t->date('transfer_date')->nullable();
            $t->string('proof_url', 255)->nullable();
            $t->string('note', 500)->nullable();
            $t->string('status', 20)->default('pending'); // pending | verified | rejected
            $t->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamp('reviewed_at')->nullable();
            $t->string('rejection_reason', 255)->nullable();
            $t->timestamps();
            $t->index(['status', 'created_at']);
            $t->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_payments');
    }
};
