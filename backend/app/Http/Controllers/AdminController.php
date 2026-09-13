<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    private function guard(Request $r)
    {
        return $r->user()->role === 'admin';
    }

    public function restaurants(Request $r)
    {
        if (! $this->guard($r)) return response()->json(['message' => 'Forbidden'], 403);

        User::where('role', 'owner')->get()->each->refreshSubscriptionStatus();

        return response()->json(['data' => User::where('role', 'owner')->with('restaurantSetting')->get([
            'id', 'name', 'restaurant_name', 'restaurant_phone', 'email', 'plan',
            'trial_started_at', 'trial_ends_at', 'subscription_started_at', 'subscription_ends_at', 'created_at',
        ])]);
    }

    public function plan(Request $r, $id)
    {
        if (! $this->guard($r)) return response()->json(['message' => 'Forbidden'], 403);

        $v = $r->validate(['plan' => 'required|in:basic,pro,premium']);
        $u = User::where('role', 'owner')->findOrFail($id);
        $u->update(['plan' => $v['plan'], 'subscription_started_at' => now(), 'subscription_ends_at' => null]);

        return response()->json(['data' => $u->fresh()]);
    }

    public function extendTrial(Request $r, $id)
    {
        if (! $this->guard($r)) return response()->json(['message' => 'Forbidden'], 403);

        $v = $r->validate(['days' => 'required|integer|min:1|max:365']);
        $u = User::where('role', 'owner')->findOrFail($id);
        $base = $u->trial_ends_at && $u->trial_ends_at->isFuture() ? $u->trial_ends_at : now();
        $u->update([
            'plan' => 'trial',
            'trial_started_at' => $u->trial_started_at ?: now(),
            'trial_ends_at' => $base->copy()->addDays($v['days']),
        ]);

        return response()->json(['data' => $u->fresh()]);
    }

    public function updateOwner(Request $r, $id)
    {
        if (! $this->guard($r)) return response()->json(['message' => 'Forbidden'], 403);

        $u = User::where('role', 'owner')->findOrFail($id);
        $v = $r->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $u->id,
            'restaurant_name' => 'nullable|string|max:255',
            'restaurant_phone' => 'nullable|string|max:50',
        ]);
        $u->update($v);

        return response()->json(['data' => $u->fresh()]);
    }

    public function reports(Request $r)
    {
        if (! $this->guard($r)) return response()->json(['message' => 'Forbidden'], 403);

        $days = min(max((int) $r->query('days', 30), 7), 365);
        $from = now()->startOfDay()->subDays($days - 1);

        $owners = User::where('role', 'owner');
        $totalRestaurants = (clone $owners)->count();
        $activeRestaurants = (clone $owners)
            ->where(function ($q) {
                $q->whereIn('plan', ['basic', 'pro', 'premium'])
                  ->orWhere(function ($trial) {
                      $trial->where('plan', 'trial')->where('trial_ends_at', '>', now());
                  });
            })->count();
        $trialRestaurants = (clone $owners)->where('plan', 'trial')->count();
        $paidRestaurants = (clone $owners)->whereIn('plan', ['basic', 'pro', 'premium'])->count();

        $ordersQuery = DB::table('orders')->where('orders.created_at', '>=', $from);
        $totalOrders = (clone $ordersQuery)->count();
        $completedOrders = (clone $ordersQuery)->whereIn('status', ['served', 'completed'])->count();
        $pendingOrders = (clone $ordersQuery)->whereIn('status', ['pending', 'preparing', 'ready'])->count();
        $cancelledOrders = (clone $ordersQuery)->where('status', 'cancelled')->count();

        $paymentsQuery = DB::table('payments')->where('paid_at', '>=', $from);
        $revenue = (float) (clone $paymentsQuery)->sum('amount');
        $paymentsCount = (clone $paymentsQuery)->count();
        $averagePayment = $paymentsCount ? round($revenue / $paymentsCount, 2) : 0;

        $dailyOrders = DB::table('orders')
            ->selectRaw('DATE(created_at) as date, COUNT(*) as orders')
            ->where('created_at', '>=', $from)
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        $dailyRevenue = DB::table('payments')
            ->selectRaw('DATE(paid_at) as date, SUM(amount) as revenue')
            ->where('paid_at', '>=', $from)
            ->groupBy(DB::raw('DATE(paid_at)'))
            ->orderBy('date')
            ->get();

        $revenueByDate = $dailyRevenue->keyBy('date');
        $trend = $dailyOrders->map(fn ($row) => [
            'date' => $row->date,
            'orders' => (int) $row->orders,
            'revenue' => (float) ($revenueByDate[$row->date]->revenue ?? 0),
        ])->values();

        $plans = (clone $owners)->select('plan', DB::raw('COUNT(*) as count'))
            ->groupBy('plan')->orderByDesc('count')->get();

        $topRestaurants = DB::table('payments')
            ->join('dining_sessions', 'dining_sessions.id', '=', 'payments.dining_session_id')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->join('users', 'users.id', '=', 'restaurant_tables.user_id')
            ->where('payments.paid_at', '>=', $from)
            ->where('users.role', 'owner')
            ->select('users.id', 'users.restaurant_name', DB::raw('COUNT(payments.id) as payments'), DB::raw('SUM(payments.amount) as revenue'))
            ->groupBy('users.id', 'users.restaurant_name')
            ->orderByDesc('revenue')->limit(10)->get();

        return response()->json(['data' => [
            'period' => ['days' => $days, 'from' => $from->toDateString(), 'to' => now()->toDateString()],
            'restaurants' => compact('totalRestaurants', 'activeRestaurants', 'trialRestaurants', 'paidRestaurants'),
            'orders' => compact('totalOrders', 'completedOrders', 'pendingOrders', 'cancelledOrders'),
            'revenue' => compact('revenue', 'paymentsCount', 'averagePayment'),
            'trend' => $trend,
            'plans' => $plans,
            'topRestaurants' => $topRestaurants,
        ]]);
    }
}
