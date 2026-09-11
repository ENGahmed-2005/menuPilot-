<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('order_id')->nullable()->after('dining_session_id')->constrained('orders')->nullOnDelete();
            $table->string('status')->default('pending')->after('method');
            $table->string('provider')->nullable()->after('status');
            $table->string('payer_name')->nullable()->after('provider');
            $table->string('payer_phone')->nullable()->after('payer_name');
            $table->string('proof_path')->nullable()->after('payer_phone');
            $table->timestamp('verified_at')->nullable()->after('paid_at');
            $table->foreignId('verified_by')->nullable()->after('verified_at')->constrained('users')->nullOnDelete();
            $table->text('rejection_reason')->nullable()->after('verified_by');
            $table->index(['dining_session_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['order_id']);
            $table->dropForeign(['verified_by']);
            $table->dropIndex(['dining_session_id', 'status']);
            $table->dropColumn([
                'order_id', 'status', 'provider', 'payer_name', 'payer_phone',
                'proof_path', 'verified_at', 'verified_by', 'rejection_reason',
            ]);
        });
    }
};
