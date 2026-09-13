<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OwnerReportsController extends Controller
{
    public function salesTrend(Request $request)
    {
        $ownerId = (int) $request->user()->id;
        $days = min(max((int) $request->query('days', 30), 7), 365);
        $from = now()->startOfDay()->subDays($days - 1);

        $orders = DB::table('orders')
            ->join('dining_sessions', 'dining_sessions.id', '=', 'orders.dining_session_id')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('restaurant_tables.user_id', $ownerId)
            ->where('orders.created_at', '>=', $from);

        $payments = DB::table('payments')
            ->join('dining_sessions', 'dining_sessions.id', '=', 'payments.dining_session_id')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('restaurant_tables.user_id', $ownerId)
            ->where('payments.status', 'verified')
            ->where('payments.paid_at', '>=', $from);

        $totalOrders = (clone $orders)->count();
        $completedOrders = (clone $orders)->whereIn('orders.status', ['served', 'completed'])->count();
        $pendingOrders = (clone $orders)->whereIn('orders.status', ['pending', 'preparing', 'ready'])->count();
        $cancelledOrders = (clone $orders)->where('orders.status', 'cancelled')->count();
        $revenue = (float) (clone $payments)->sum('payments.amount');
        $paymentsCount = (clone $payments)->count();
        $averageOrder = $completedOrders > 0 ? round($revenue / $completedOrders, 2) : 0;

        $dailyOrders = (clone $orders)
            ->selectRaw('DATE(orders.created_at) as date, COUNT(*) as orders')
            ->groupBy(DB::raw('DATE(orders.created_at)'))
            ->orderBy('date')
            ->get();

        $dailyRevenue = (clone $payments)
            ->selectRaw('DATE(payments.paid_at) as date, SUM(payments.amount) as revenue')
            ->groupBy(DB::raw('DATE(payments.paid_at)'))
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $trend = $dailyOrders->map(fn ($row) => [
            'date' => $row->date,
            'orders' => (int) $row->orders,
            'revenue' => (float) ($dailyRevenue[$row->date]->revenue ?? 0),
        ])->values();

        $topItems = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('dining_sessions', 'dining_sessions.id', '=', 'orders.dining_session_id')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->join('menu_items', 'menu_items.id', '=', 'order_items.menu_item_id')
            ->where('restaurant_tables.user_id', $ownerId)
            ->where('orders.created_at', '>=', $from)
            ->where('order_items.status', 'active')
            ->select('menu_items.name', DB::raw('SUM(order_items.quantity) as quantity'), DB::raw('SUM(order_items.quantity * order_items.unit_price) as revenue'))
            ->groupBy('menu_items.id', 'menu_items.name')
            ->orderByDesc('quantity')
            ->limit(5)
            ->get();

        return response()->json(['data' => [
            'period' => ['days' => $days, 'from' => $from->toDateString(), 'to' => now()->toDateString()],
            'summary' => compact('totalOrders', 'completedOrders', 'pendingOrders', 'cancelledOrders', 'revenue', 'paymentsCount', 'averageOrder'),
            'trend' => $trend,
            'topItems' => $topItems,
        ]]);
    }
}
