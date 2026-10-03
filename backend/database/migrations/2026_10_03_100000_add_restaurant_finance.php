<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Restaurant finance (App\Support\Finance): employees with monthly salaries
 * (with or without a login account) and expenses (one-off or monthly), so
 * the owner sees profit = revenue − salaries − expenses.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('restaurant_employees')) {
            Schema::create('restaurant_employees', function (Blueprint $t) {
                $t->id();
                $t->foreignId('user_id')->constrained('users')->cascadeOnDelete(); // the restaurant (owner)
                $t->foreignId('staff_id')->nullable()->constrained('users')->nullOnDelete(); // their login account, if any
                $t->string('name', 120);
                $t->string('job_title', 80)->nullable();
                $t->string('phone', 30)->nullable();
                $t->decimal('monthly_salary', 10, 2);
                $t->date('starts_on')->nullable();
                $t->date('ends_on')->nullable();
                $t->string('notes', 255)->nullable();
                $t->timestamps();
                $t->index(['user_id', 'ends_on']);
            });
        }
        if (! Schema::hasTable('restaurant_expenses')) {
            Schema::create('restaurant_expenses', function (Blueprint $t) {
                $t->id();
                $t->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $t->string('category', 30); // rent|utilities|supplies|maintenance|marketing|other
                $t->string('title', 120);
                $t->decimal('amount', 10, 2);
                $t->date('spent_on');
                $t->boolean('recurring')->default(false); // monthly, from spent_on until ends_on
                $t->date('ends_on')->nullable();
                $t->string('notes', 255)->nullable();
                $t->timestamps();
                $t->index(['user_id', 'spent_on']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_expenses');
        Schema::dropIfExists('restaurant_employees');
    }
};
