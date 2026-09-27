<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AdminController extends Controller
{
    private function guard(Request $r)
    {
        return $r->user()->role === 'admin';
    }

    public function restaurants(Request $r)
    {
        if (! $this->guard($r)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        User::where('role', 'owner')->get()->each->refreshSubscriptionStatus();

        return response()->json(['data' => User::where('role', 'owner')->with('restaurantSetting')->get([
            'id', 'name', 'restaurant_name', 'restaurant_phone', 'email', 'plan',
            'trial_started_at', 'trial_ends_at', 'subscription_started_at', 'subscription_ends_at', 'created_at',
            'is_active', 'last_active_at',
        ])]);
    }

    public function plan(Request $r, $id)
    {
        if (! $this->guard($r)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $v = $r->validate(['plan' => 'required|in:basic,pro,premium']);
        $u = User::where('role', 'owner')->findOrFail($id);
        $before = $u->plan;
        $u->update(['plan' => $v['plan'], 'subscription_started_at' => now(), 'subscription_ends_at' => null]);
        Audit::log($r, 'admin.plan_changed', 'restaurant', $u->id, ['from' => $before, 'to' => $v['plan']], $u->id);

        return response()->json(['data' => $u->fresh()]);
    }

    public function extendTrial(Request $r, $id)
    {
        if (! $this->guard($r)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $v = $r->validate(['days' => 'required|integer|min:1|max:365']);
        $u = User::where('role', 'owner')->findOrFail($id);
        $base = $u->trial_ends_at && $u->trial_ends_at->isFuture() ? $u->trial_ends_at : now();
        $u->update([
            'plan' => 'trial',
            'trial_started_at' => $u->trial_started_at ?: now(),
            'trial_ends_at' => $base->copy()->addDays($v['days']),
        ]);
        Audit::log($r, 'admin.trial_extended', 'restaurant', $u->id, ['days' => $v['days'], 'trial_ends_at' => (string) $u->trial_ends_at], $u->id);

        return response()->json(['data' => $u->fresh()]);
    }

    public function updateOwner(Request $r, $id)
    {
        if (! $this->guard($r)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $u = User::where('role', 'owner')->findOrFail($id);
        $v = $r->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,'.$u->id,
            'restaurant_name' => 'nullable|string|max:255',
            'restaurant_phone' => 'nullable|string|max:50',
        ]);
        $u->update($v);
        Audit::log($r, 'admin.owner_updated', 'user', $u->id, ['fields' => array_keys($v)], $u->id);

        return response()->json(['data' => $u->fresh()]);
    }

    /**
     * POST admin/restaurants — create a restaurant (owner account) from the
     * admin panel. The password is generated when not given and returned once.
     */
    public function storeRestaurant(Request $r)
    {
        if (! $this->guard($r)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $v = $r->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'restaurant_name' => 'required|string|max:255',
            'restaurant_phone' => 'nullable|string|max:50',
            'plan' => 'nullable|in:trial,basic,pro,premium',
            'password' => 'nullable|string|min:8',
        ]);
        $plan = $v['plan'] ?? 'trial';
        $password = $v['password'] ?? 'MP-'.Str::upper(Str::random(6)).'-'.random_int(100, 999);
        $now = now();

        $owner = User::create([
            'name' => $v['name'],
            'email' => Str::lower(trim($v['email'])),
            'restaurant_name' => $v['restaurant_name'],
            'restaurant_phone' => $v['restaurant_phone'] ?? null,
            'password' => Hash::make($password),
            'role' => 'owner',
            'plan' => $plan,
            'is_active' => true,
            'trial_started_at' => $plan === 'trial' ? $now : null,
            'trial_ends_at' => $plan === 'trial' ? $now->copy()->addDays(14) : null,
            'subscription_started_at' => $plan === 'trial' ? null : $now,
        ]);
        Audit::log($r, 'admin.restaurant_created', 'restaurant', $owner->id, ['restaurant' => $owner->restaurant_name, 'plan' => $plan], $owner->id);

        return response()->json(['data' => ['restaurant' => $owner->fresh(), 'generated_password' => isset($v['password']) ? null : $password]], 201);
    }

    /**
     * DELETE admin/restaurants/{id} {confirm_email}
     * Permanently removes a restaurant: owner, staff accounts, tables, menu,
     * sessions, orders and payments. Requires typing the owner's email and is
     * refused while a table has an active dining session.
     */
    public function destroyRestaurant(Request $r, $id)
    {
        if (! $this->guard($r)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $owner = User::where('role', 'owner')->findOrFail($id);
        $r->validate(['confirm_email' => 'required|string']);
        if (Str::lower(trim($r->input('confirm_email'))) !== Str::lower($owner->email)) {
            return response()->json(['message' => 'البريد المدخل لا يطابق بريد صاحب المطعم.', 'code' => 'CONFIRMATION_MISMATCH'], 422);
        }

        $tableIds = DB::table('restaurant_tables')->where('user_id', $owner->id)->pluck('id');
        $sessionIds = DB::table('dining_sessions')->whereIn('restaurant_table_id', $tableIds)->pluck('id');
        if (DB::table('dining_sessions')->whereIn('id', $sessionIds)->whereNull('closed_at')->exists()) {
            return response()->json(['message' => 'في المطعم جلسات طاولات مفتوحة. يجب إغلاقها قبل الحذف.', 'code' => 'RESTAURANT_HAS_ACTIVE_SESSIONS'], 409);
        }

        $snapshot = ['restaurant' => $owner->restaurant_name, 'email' => $owner->email, 'plan' => $owner->plan];
        DB::transaction(function () use ($owner, $sessionIds) {
            // Children first, so this works whether or not every FK cascades.
            $orderIds = DB::table('orders')->where('user_id', $owner->id)->orWhereIn('dining_session_id', $sessionIds)->pluck('id');
            foreach (['order_status_histories' => 'order_id', 'order_items' => 'order_id'] as $table => $column) {
                if (Schema::hasTable($table)) {
                    DB::table($table)->whereIn($column, $orderIds)->delete();
                }
            }
            if (Schema::hasTable('bill_adjustments')) {
                DB::table('bill_adjustments')->whereIn('dining_session_id', $sessionIds)->delete();
            }
            DB::table('payments')->whereIn('dining_session_id', $sessionIds)->delete();
            DB::table('orders')->whereIn('id', $orderIds)->delete();
            DB::table('assistance_requests')->whereIn('dining_session_id', $sessionIds)->delete();
            DB::table('dining_sessions')->whereIn('id', $sessionIds)->delete();

            $staffUserIds = DB::table('staff')->where('user_id', $owner->id)->pluck('account_user_id')->filter();
            DB::table('staff')->where('user_id', $owner->id)->delete();
            User::whereIn('id', $staffUserIds)->where('role', '!=', 'admin')->delete();
            $owner->delete(); // cascades tables, menu, categories, branding
        });
        Audit::log($r, 'admin.restaurant_deleted', 'restaurant', (int) $id, $snapshot, null);

        return response()->json(['data' => ['message' => 'Deleted']]);
    }

    /**
     * PATCH admin/owners/{id}/status {active}
     * Disabling an owner revokes their token and blocks their whole restaurant
     * (staff are rejected by ApiAuth while the owner is inactive). Records are kept.
     */
    public function ownerStatus(Request $r, $id)
    {
        if (! $this->guard($r)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $v = $r->validate(['active' => 'required|boolean']);
        $u = User::where('role', 'owner')->findOrFail($id);
        $u->update(['is_active' => $v['active']] + ($v['active'] ? [] : ['api_token' => null]));
        Audit::log($r, $v['active'] ? 'admin.owner_enabled' : 'admin.owner_disabled', 'user', $u->id, [], $u->id);

        return response()->json(['data' => $u->fresh()]);
    }

    public function reports(Request $r)
    {
        if (! $this->guard($r)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

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
