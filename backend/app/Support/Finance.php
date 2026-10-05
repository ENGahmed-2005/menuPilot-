<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A restaurant's month in money: revenue − salaries − expenses = profit.
 *
 *  revenue   verified table payments (paid_at in the month, as in the owner
 *            reports) + completed outside orders (items + delivery fee)
 *  salaries  per employee: a daily rate × the paid days in the month
 *              monthly  rate ÷ days in the month, weekly  rate ÷ 7,
 *              daily    the rate itself
 *            paid days: monthly and weekly — days employed (starts_on /
 *            ends_on) minus absences (half day = ½); a day with no record
 *            counts as worked, so forgetting to mark it never cuts pay.
 *            daily — only the days marked present (half day = ½).
 *            Paid leave counts for monthly and weekly, not for daily.
 *  expenses  one-off expenses dated in the month + monthly ones running
 *            in it (from spent_on until ends_on)
 */
class Finance
{
    public const CATEGORIES = ['rent', 'utilities', 'supplies', 'maintenance', 'marketing', 'other'];

    public const PAY_TYPES = ['monthly', 'weekly', 'daily'];

    public const ATTENDANCE = ['present', 'absent', 'leave', 'half'];

    /**
     * One employee's pay for a month, with the days behind it.
     *
     * @param  array<string, string>  $marks  day (Y-m-d) => status, for this month
     */
    public static function pay(object $employee, CarbonImmutable $month, array $marks): array
    {
        $from = $month->startOfMonth();
        $to = $month->endOfMonth();
        $start = $employee->starts_on ? max(CarbonImmutable::parse($employee->starts_on)->startOfDay(), $from) : $from;
        $end = $employee->ends_on ? min(CarbonImmutable::parse($employee->ends_on)->startOfDay(), $to->startOfDay()) : $to->startOfDay();
        $counts = ['present' => 0, 'absent' => 0, 'leave' => 0, 'half' => 0];
        if ($end < $start) {
            return ['amount' => 0.0, 'days_employed' => 0, 'paid_days' => 0.0] + $counts;
        }
        foreach ($marks as $day => $status) {
            $d = CarbonImmutable::parse($day);
            if ($d >= $start && $d <= $end && isset($counts[$status])) {
                $counts[$status]++;
            }
        }
        $employed = $start->diffInDays($end) + 1;
        $type = $employee->pay_type ?? 'monthly';
        $rate = (float) ($employee->pay_rate ?? $employee->monthly_salary);
        if ($type === 'daily') {
            $paid = $counts['present'] + 0.5 * $counts['half'];
            $perDay = $rate;
        } else {
            $paid = max(0, $employed - $counts['absent'] - 0.5 * $counts['half']);
            $perDay = $type === 'weekly' ? $rate / 7 : $rate / $from->daysInMonth;
        }

        return ['amount' => round($perDay * $paid, 2), 'days_employed' => (int) $employed, 'paid_days' => (float) $paid] + $counts;
    }

    /** day (Y-m-d) => status for each employee id, for the month. */
    public static function marks(array $employeeIds, CarbonImmutable $month): array
    {
        $rows = DB::table('employee_attendance')->whereIn('employee_id', $employeeIds ?: [0])
            ->whereBetween('day', [$month->startOfMonth()->toDateString(), $month->endOfMonth()->toDateString()])
            ->get(['employee_id', 'day', 'status']);
        $out = [];
        foreach ($rows as $r) {
            $out[$r->employee_id][substr((string) $r->day, 0, 10)] = $r->status;
        }

        return $out;
    }

    public static function month(int $ownerId, CarbonImmutable $month): array
    {
        $from = $month->startOfMonth();
        $to = $month->endOfMonth();

        $tables = (float) DB::table('payments')
            ->join('dining_sessions', 'dining_sessions.id', '=', 'payments.dining_session_id')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('restaurant_tables.user_id', $ownerId)
            ->where('payments.status', 'verified')
            ->whereBetween('payments.paid_at', [$from, $to])
            ->sum('payments.amount');

        $outside = 0.0;
        if (Schema::hasColumn('orders', 'channel')) {
            $orders = DB::table('orders')->where('user_id', $ownerId)->where('channel', '!=', 'dine_in')
                ->where('fulfillment_status', 'completed')->whereBetween('completed_at', [$from, $to]);
            $items = DB::table('order_items')->whereIn('order_id', (clone $orders)->select('id'));
            if (Schema::hasColumn('order_items', 'status')) {
                $items->where(fn ($q) => $q->whereNull('status')->orWhere('status', '!=', 'cancelled'));
            }
            $outside = (float) $items->sum(DB::raw('quantity * unit_price')) + (float) (clone $orders)->sum('delivery_fee');
        }

        $salaries = 0.0;
        $employees = DB::table('restaurant_employees')->where('user_id', $ownerId)
            ->where(fn ($q) => $q->whereNull('starts_on')->orWhere('starts_on', '<=', $to->toDateString()))
            ->where(fn ($q) => $q->whereNull('ends_on')->orWhere('ends_on', '>=', $from->toDateString()))
            ->get(['id', 'monthly_salary', 'pay_type', 'pay_rate', 'starts_on', 'ends_on']);
        $marks = self::marks($employees->pluck('id')->all(), $from);
        foreach ($employees as $e) {
            $salaries += self::pay($e, $from, $marks[$e->id] ?? [])['amount'];
        }

        $byCategory = array_fill_keys(self::CATEGORIES, 0.0);
        $expenses = DB::table('restaurant_expenses')->where('user_id', $ownerId)
            ->where(function ($q) use ($from, $to) {
                $q->where(fn ($one) => $one->where('recurring', false)->whereBetween('spent_on', [$from->toDateString(), $to->toDateString()]))
                    ->orWhere(fn ($monthly) => $monthly->where('recurring', true)->where('spent_on', '<=', $to->toDateString())
                        ->where(fn ($e) => $e->whereNull('ends_on')->orWhere('ends_on', '>=', $from->toDateString())));
            })
            ->get(['category', 'amount']);
        foreach ($expenses as $x) {
            $byCategory[$x->category] = ($byCategory[$x->category] ?? 0) + (float) $x->amount;
        }

        $revenue = round($tables + $outside, 2);
        $salaries = round($salaries, 2);
        $expensesTotal = round(array_sum($byCategory), 2);
        $profit = round($revenue - $salaries - $expensesTotal, 2);

        return [
            'month' => $from->format('Y-m'),
            'revenue' => $revenue,
            'revenue_tables' => round($tables, 2),
            'revenue_outside' => round($outside, 2),
            'salaries' => $salaries,
            'employees' => $employees->count(),
            'expenses' => $expensesTotal,
            'expenses_by_category' => array_map(fn ($v) => round($v, 2), $byCategory),
            'profit' => $profit,
            'margin' => $revenue > 0 ? round($profit / $revenue * 100, 1) : null,
        ];
    }
}
