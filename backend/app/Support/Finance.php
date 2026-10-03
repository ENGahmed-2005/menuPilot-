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
 *  salaries  each employee's monthly salary × the share of the month they
 *            were employed (starts_on / ends_on)
 *  expenses  one-off expenses dated in the month + monthly ones running
 *            in it (from spent_on until ends_on)
 */
class Finance
{
    public const CATEGORIES = ['rent', 'utilities', 'supplies', 'maintenance', 'marketing', 'other'];

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

        $days = $from->daysInMonth;
        $salaries = 0.0;
        $employees = DB::table('restaurant_employees')->where('user_id', $ownerId)
            ->where(fn ($q) => $q->whereNull('starts_on')->orWhere('starts_on', '<=', $to->toDateString()))
            ->where(fn ($q) => $q->whereNull('ends_on')->orWhere('ends_on', '>=', $from->toDateString()))
            ->get(['monthly_salary', 'starts_on', 'ends_on']);
        foreach ($employees as $e) {
            $start = $e->starts_on ? max(CarbonImmutable::parse($e->starts_on), $from) : $from;
            $end = $e->ends_on ? min(CarbonImmutable::parse($e->ends_on)->endOfDay(), $to) : $to;
            $worked = $start->startOfDay()->diffInDays($end->startOfDay()) + 1;
            $salaries += (float) $e->monthly_salary * min($worked, $days) / $days;
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
