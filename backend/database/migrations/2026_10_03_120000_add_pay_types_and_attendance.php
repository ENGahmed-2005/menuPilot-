<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Pay types and attendance (App\Support\Finance):
 *  restaurant_employees.pay_type   monthly | weekly | daily
 *  restaurant_employees.pay_rate   the amount per month, week or day
 *  employee_attendance             one row per employee per day:
 *                                  present | absent | leave | half
 * Existing employees become monthly, with their salary as the rate.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurant_employees', function (Blueprint $t) {
            if (! Schema::hasColumn('restaurant_employees', 'pay_type')) {
                $t->string('pay_type', 10)->default('monthly')->after('phone');
            }
            if (! Schema::hasColumn('restaurant_employees', 'pay_rate')) {
                $t->decimal('pay_rate', 10, 2)->default(0)->after('pay_type');
            }
        });
        DB::table('restaurant_employees')->where('pay_rate', 0)->update(['pay_rate' => DB::raw('monthly_salary')]);

        if (! Schema::hasTable('employee_attendance')) {
            Schema::create('employee_attendance', function (Blueprint $t) {
                $t->id();
                $t->foreignId('employee_id')->constrained('restaurant_employees')->cascadeOnDelete();
                $t->date('day');
                $t->string('status', 10); // present|absent|leave|half
                $t->string('note', 160)->nullable();
                $t->timestamps();
                $t->unique(['employee_id', 'day']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_attendance');
        Schema::table('restaurant_employees', function (Blueprint $t) {
            $t->dropColumn(['pay_type', 'pay_rate']);
        });
    }
};
