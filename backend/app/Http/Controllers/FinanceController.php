<?php

namespace App\Http\Controllers;

use App\Support\Audit;
use App\Support\Finance;
use App\Support\SubscriptionAccess;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Salaries, expenses and profit for the restaurant (App\Support\Finance).
 * Owner, or staff given «manage_finance»; part of the «reports» feature.
 */
class FinanceController extends Controller
{
    private function ownerId(Request $r): int
    {
        return (int) (SubscriptionAccess::for($r->user())->owner()?->id ?? $r->user()->id);
    }

    /** GET owner/finance/summary?month=YYYY-MM — the month and the five before it. */
    public function summary(Request $r)
    {
        $v = $r->validate(['month' => ['sometimes', 'date_format:Y-m']]);
        $month = CarbonImmutable::createFromFormat('Y-m-d', ($v['month'] ?? now()->format('Y-m')).'-01')->startOfDay();
        $owner = $this->ownerId($r);
        $series = [];
        for ($i = 5; $i >= 0; $i--) {
            $m = Finance::month($owner, $month->subMonthsNoOverflow($i));
            $series[] = ['month' => $m['month'], 'revenue' => $m['revenue'], 'costs' => round($m['salaries'] + $m['expenses'], 2), 'profit' => $m['profit']];
        }

        return response()->json(['data' => Finance::month($owner, $month) + ['series' => $series]]);
    }

    private function employeeRules(int $owner): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'job_title' => ['nullable', 'string', 'max:80'],
            'phone' => ['nullable', 'string', 'max:30'],
            'monthly_salary' => ['required', 'numeric', 'min:0', 'max:1000000'],
            'starts_on' => ['nullable', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'notes' => ['nullable', 'string', 'max:255'],
            // Only this restaurant's own staff accounts can be linked.
            'staff_id' => ['nullable', 'integer', Rule::exists('staff', 'account_user_id')->where('user_id', $owner)],
        ];
    }

    public function employees(Request $r)
    {
        return response()->json(['data' => DB::table('restaurant_employees')->where('user_id', $this->ownerId($r))
            ->orderByRaw('ends_on is not null')->orderBy('name')->get()]);
    }

    public function storeEmployee(Request $r)
    {
        $owner = $this->ownerId($r);
        $v = $r->validate($this->employeeRules($owner));
        $id = DB::table('restaurant_employees')->insertGetId($v + ['user_id' => $owner, 'created_at' => now(), 'updated_at' => now()]);
        Audit::log($r, 'finance.employee_added', 'restaurant_employee', $id, ['name' => $v['name'], 'monthly_salary' => $v['monthly_salary']], $owner);

        return response()->json(['data' => DB::table('restaurant_employees')->find($id)], 201);
    }

    public function updateEmployee(Request $r, $id)
    {
        $owner = $this->ownerId($r);
        $row = DB::table('restaurant_employees')->where('user_id', $owner)->where('id', $id)->first() ?? abort(404);
        $v = $r->validate(array_map(fn ($rule) => array_values(array_diff($rule, ['required'])) ?: ['sometimes'], $this->employeeRules($owner)));
        DB::table('restaurant_employees')->where('id', $row->id)->update($v + ['updated_at' => now()]);
        if (array_key_exists('monthly_salary', $v) && (float) $v['monthly_salary'] !== (float) $row->monthly_salary) {
            Audit::log($r, 'finance.salary_changed', 'restaurant_employee', $row->id, ['from' => $row->monthly_salary, 'to' => $v['monthly_salary']], $owner);
        }

        return response()->json(['data' => DB::table('restaurant_employees')->find($row->id)]);
    }

    public function destroyEmployee(Request $r, $id)
    {
        $owner = $this->ownerId($r);
        $row = DB::table('restaurant_employees')->where('user_id', $owner)->where('id', $id)->first() ?? abort(404);
        DB::table('restaurant_employees')->where('id', $row->id)->delete();
        Audit::log($r, 'finance.employee_removed', 'restaurant_employee', $row->id, ['name' => $row->name], $owner);

        return response()->json(['data' => ['deleted' => true]]);
    }

    private function expenseRules(): array
    {
        return [
            'category' => ['required', Rule::in(Finance::CATEGORIES)],
            'title' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:0', 'max:10000000'],
            'spent_on' => ['required', 'date'],
            'recurring' => ['sometimes', 'boolean'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:spent_on'],
            'notes' => ['nullable', 'string', 'max:255'],
        ];
    }

    /** GET owner/finance/expenses?month=YYYY-MM — that month's one-off expenses and every monthly one. */
    public function expenses(Request $r)
    {
        $v = $r->validate(['month' => ['sometimes', 'date_format:Y-m']]);
        $q = DB::table('restaurant_expenses')->where('user_id', $this->ownerId($r));
        if (isset($v['month'])) {
            $from = CarbonImmutable::createFromFormat('Y-m-d', $v['month'].'-01')->startOfMonth();
            $q->where(fn ($w) => $w->where('recurring', true)->orWhereBetween('spent_on', [$from->toDateString(), $from->endOfMonth()->toDateString()]));
        }

        return response()->json(['data' => $q->orderByDesc('recurring')->orderByDesc('spent_on')->get()]);
    }

    public function storeExpense(Request $r)
    {
        $owner = $this->ownerId($r);
        $v = $r->validate($this->expenseRules());
        $id = DB::table('restaurant_expenses')->insertGetId($v + ['user_id' => $owner, 'recurring' => (bool) ($v['recurring'] ?? false), 'created_at' => now(), 'updated_at' => now()]);
        Audit::log($r, 'finance.expense_added', 'restaurant_expense', $id, ['title' => $v['title'], 'amount' => $v['amount']], $owner);

        return response()->json(['data' => DB::table('restaurant_expenses')->find($id)], 201);
    }

    public function updateExpense(Request $r, $id)
    {
        $owner = $this->ownerId($r);
        $row = DB::table('restaurant_expenses')->where('user_id', $owner)->where('id', $id)->first() ?? abort(404);
        $v = $r->validate(array_map(fn ($rule) => array_values(array_diff($rule, ['required'])) ?: ['sometimes'], $this->expenseRules()));
        DB::table('restaurant_expenses')->where('id', $row->id)->update($v + ['updated_at' => now()]);

        return response()->json(['data' => DB::table('restaurant_expenses')->find($row->id)]);
    }

    public function destroyExpense(Request $r, $id)
    {
        $owner = $this->ownerId($r);
        $row = DB::table('restaurant_expenses')->where('user_id', $owner)->where('id', $id)->first() ?? abort(404);
        DB::table('restaurant_expenses')->where('id', $row->id)->delete();
        Audit::log($r, 'finance.expense_removed', 'restaurant_expense', $row->id, ['title' => $row->title, 'amount' => $row->amount], $owner);

        return response()->json(['data' => ['deleted' => true]]);
    }
}
