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
            'pay_type' => ['sometimes', Rule::in(Finance::PAY_TYPES)],
            'pay_rate' => ['required_without:monthly_salary', 'numeric', 'min:0', 'max:1000000'],
            'monthly_salary' => ['sometimes', 'numeric', 'min:0', 'max:1000000'], // older clients: a monthly salary
            'starts_on' => ['nullable', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'notes' => ['nullable', 'string', 'max:255'],
            // Only this restaurant's own staff accounts can be linked.
            'staff_id' => ['nullable', 'integer', Rule::exists('staff', 'account_user_id')->where('user_id', $owner)],
        ];
    }

    /**
     * pay_type + pay_rate, accepting an older { monthly_salary } too;
     * monthly_salary keeps a monthly estimate for lists and exports.
     */
    private static function payFields(array $v, ?object $row = null): array
    {
        if (! isset($v['pay_rate']) && isset($v['monthly_salary'])) {
            $v['pay_type'] = $v['pay_type'] ?? 'monthly';
            $v['pay_rate'] = $v['monthly_salary'];
        }
        $type = $v['pay_type'] ?? $row->pay_type ?? 'monthly';
        $rate = (float) ($v['pay_rate'] ?? $row->pay_rate ?? 0);
        if (isset($v['pay_rate']) || isset($v['pay_type'])) {
            $v['pay_type'] = $type;
            $v['pay_rate'] = $rate;
            $v['monthly_salary'] = round(match ($type) {
                'weekly' => $rate * 52 / 12, 'daily' => $rate * 26, default => $rate
            }, 2);
        }

        return $v;
    }

    public function employees(Request $r)
    {
        return response()->json(['data' => DB::table('restaurant_employees')->where('user_id', $this->ownerId($r))
            ->orderByRaw('ends_on is not null')->orderBy('name')->get()]);
    }

    public function storeEmployee(Request $r)
    {
        $owner = $this->ownerId($r);
        $v = self::payFields($r->validate($this->employeeRules($owner)));
        $id = DB::table('restaurant_employees')->insertGetId($v + ['user_id' => $owner, 'created_at' => now(), 'updated_at' => now()]);
        Audit::log($r, 'finance.employee_added', 'restaurant_employee', $id, ['name' => $v['name'], 'pay_type' => $v['pay_type'], 'pay_rate' => $v['pay_rate']], $owner);

        return response()->json(['data' => DB::table('restaurant_employees')->find($id)], 201);
    }

    public function updateEmployee(Request $r, $id)
    {
        $owner = $this->ownerId($r);
        $row = DB::table('restaurant_employees')->where('user_id', $owner)->where('id', $id)->first() ?? abort(404);
        // On edit every field is optional: send only what changes.
        $rules = array_map(fn ($rule) => array_values(array_diff($rule, ['required'])) ?: ['sometimes'], $this->employeeRules($owner));
        $rules['pay_rate'] = ['sometimes', 'numeric', 'min:0', 'max:1000000'];
        $v = self::payFields($r->validate($rules), $row);
        DB::table('restaurant_employees')->where('id', $row->id)->update($v + ['updated_at' => now()]);
        if ((isset($v['pay_rate']) && (float) $v['pay_rate'] !== (float) $row->pay_rate) || (isset($v['pay_type']) && $v['pay_type'] !== $row->pay_type)) {
            Audit::log($r, 'finance.salary_changed', 'restaurant_employee', $row->id, ['from' => [$row->pay_type, $row->pay_rate], 'to' => [$v['pay_type'], $v['pay_rate']]], $owner);
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

    /** GET owner/finance/payroll?month=YYYY-MM — each employee's pay and days for the month. */
    public function payroll(Request $r)
    {
        $v = $r->validate(['month' => ['sometimes', 'date_format:Y-m']]);
        $month = CarbonImmutable::createFromFormat('Y-m-d', ($v['month'] ?? now()->format('Y-m')).'-01')->startOfDay();
        $owner = $this->ownerId($r);
        $from = $month->startOfMonth()->toDateString();
        $to = $month->endOfMonth()->toDateString();
        $employees = DB::table('restaurant_employees')->where('user_id', $owner)
            ->where(fn ($q) => $q->whereNull('starts_on')->orWhere('starts_on', '<=', $to))
            ->where(fn ($q) => $q->whereNull('ends_on')->orWhere('ends_on', '>=', $from))
            ->orderBy('name')->get();
        $marks = Finance::marks($employees->pluck('id')->all(), $month);
        $rows = $employees->map(fn ($e) => [
            'id' => $e->id, 'name' => $e->name, 'job_title' => $e->job_title, 'pay_type' => $e->pay_type, 'pay_rate' => (float) $e->pay_rate,
        ] + Finance::pay($e, $month, $marks[$e->id] ?? []))->values();

        return response()->json(['data' => ['month' => $month->format('Y-m'), 'total' => round($rows->sum('amount'), 2), 'employees' => $rows]]);
    }

    /** Employees working on a day, each with its mark. */
    private function attendanceSheet(int $owner, string $day): array
    {
        $employees = DB::table('restaurant_employees')->where('user_id', $owner)
            ->where(fn ($q) => $q->whereNull('starts_on')->orWhere('starts_on', '<=', $day))
            ->where(fn ($q) => $q->whereNull('ends_on')->orWhere('ends_on', '>=', $day))
            ->orderBy('name')->get(['id', 'name', 'job_title', 'pay_type']);
        $marks = DB::table('employee_attendance')->whereIn('employee_id', $employees->pluck('id')->all() ?: [0])->where('day', $day)->get()->keyBy('employee_id');

        return ['date' => $day, 'employees' => $employees->map(fn ($e) => (array) $e + [
            'status' => $marks[$e->id]->status ?? null, 'note' => $marks[$e->id]->note ?? null,
        ])->values()];
    }

    /** GET owner/finance/attendance?date=Y-m-d */
    public function attendance(Request $r)
    {
        $v = $r->validate(['date' => ['sometimes', 'date_format:Y-m-d']]);

        return response()->json(['data' => $this->attendanceSheet($this->ownerId($r), $v['date'] ?? now()->toDateString())]);
    }

    /**
     * PUT owner/finance/attendance {date, marks: [{employee_id, status|null, note?}]}
     * Marks a day for several employees at once; a null status clears the day.
     */
    public function markAttendance(Request $r)
    {
        $owner = $this->ownerId($r);
        $v = $r->validate([
            'date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'marks' => ['required', 'array', 'max:200'],
            'marks.*.employee_id' => ['required', 'integer', 'distinct', Rule::exists('restaurant_employees', 'id')->where('user_id', $owner)],
            'marks.*.status' => ['nullable', Rule::in(Finance::ATTENDANCE)],
            'marks.*.note' => ['nullable', 'string', 'max:160'],
        ], ['date.before_or_equal' => 'لا يمكن تسجيل الحضور لتاريخ لم يأتِ بعد.']);
        DB::transaction(function () use ($v) {
            foreach ($v['marks'] as $m) {
                $key = ['employee_id' => $m['employee_id'], 'day' => $v['date']];
                if (empty($m['status'])) {
                    DB::table('employee_attendance')->where($key)->delete();

                    continue;
                }
                DB::table('employee_attendance')->updateOrInsert($key, ['status' => $m['status'], 'note' => $m['note'] ?? null, 'updated_at' => now(), 'created_at' => now()]);
            }
        });
        Audit::log($r, 'finance.attendance_marked', 'restaurant', $owner, ['date' => $v['date'], 'count' => count($v['marks'])], $owner);

        return response()->json(['data' => $this->attendanceSheet($owner, $v['date'])]);
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
