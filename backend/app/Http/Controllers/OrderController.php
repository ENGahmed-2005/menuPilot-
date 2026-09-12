<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use Illuminate\Http\Request;
use Illuminate\Http\StreamedEvent;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    private function out($data, $status = 200)
    {
        return response()->json(['data' => $data], $status);
    }

    private function restaurantId(Request $request): int
    {
        $user = $request->user();
        if ($user->role === 'owner' || $user->role === 'admin') {
            return (int) $user->id;
        }

        return (int) Staff::where('account_user_id', $user->id)->value('user_id');
    }

    private function items($id)
    {
        return DB::table('order_items')
            ->join('menu_items', 'menu_items.id', '=', 'order_items.menu_item_id')
            ->where('order_id', $id)
            ->select('order_items.*', 'menu_items.name')
            ->get();
    }

    private function orderBelongsToRestaurant($orderId, $restaurantId): bool
    {
        return DB::table('orders')
            ->join('dining_sessions', 'dining_sessions.id', '=', 'orders.dining_session_id')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('orders.id', $orderId)
            ->where('restaurant_tables.user_id', $restaurantId)
            ->exists();
    }

    private function orderItemBelongsToRestaurant($itemId, $restaurantId): bool
    {
        return DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('dining_sessions', 'dining_sessions.id', '=', 'orders.dining_session_id')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('order_items.id', $itemId)
            ->where('restaurant_tables.user_id', $restaurantId)
            ->exists();
    }

    public function submit(Request $r, $sid)
    {
        $v = $r->validate([
            'items' => 'required|array|min:1',
            'items.*.menuItemId' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.note' => 'nullable|string|max:500',
        ]);

        $s = DB::table('dining_sessions')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('dining_sessions.id', $sid)
            ->select('dining_sessions.*', 'restaurant_tables.user_id')
            ->first();

        if (! $s) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        if ($s->closed_at || $s->status === 'closed') {
            return response()->json(['message' => 'Dining session is closed.'], 409);
        }

        $menuItemIds = collect($v['items'])->pluck('menuItemId')->unique()->values();
        $availableItems = DB::table('menu_items')
            ->whereIn('id', $menuItemIds)
            ->where('user_id', $s->user_id)
            ->where('is_available', true)
            ->get()
            ->keyBy('id');

        if ($availableItems->count() !== $menuItemIds->count()) {
            return response()->json(['message' => 'One or more menu items are unavailable. Please refresh the menu and try again.'], 422);
        }

        $oid = DB::table('orders')->insertGetId([
            'dining_session_id' => $sid,
            'user_id' => $s->user_id,
            'status' => 'pending',
            'submitted_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ($v['items'] as $i) {
            $m = $availableItems->get($i['menuItemId']);
            DB::table('order_items')->insert([
                'order_id' => $oid,
                'menu_item_id' => $m->id,
                'quantity' => $i['quantity'],
                'unit_price' => $m->price,
                'note' => $i['note'] ?? null,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('dining_sessions')->where('id', $sid)->update(['status' => 'ordering', 'updated_at' => now()]);
        $o = DB::table('orders')->find($oid);
        $o->items = $this->items($oid);

        return $this->out($o, 201);
    }

    public function session($sid)
    {
        $orders = DB::table('orders')->where('dining_session_id', $sid)->latest()->get();
        foreach ($orders as $o) {
            $o->items = $this->items($o->id);
        }

        return $this->out($orders);
    }

    public function stream($sid)
    {
        return response()->eventStream(function () use ($sid) {
            $last = null;
            $startedAt = microtime(true);

            while (microtime(true) - $startedAt < 55) {
                $orders = DB::table('orders')->where('dining_session_id', $sid)->latest()->get();
                foreach ($orders as $order) {
                    $order->items = $this->items($order->id);
                }

                $payload = json_encode($orders->values()->all(), JSON_UNESCAPED_UNICODE);
                $fingerprint = md5($payload);
                if ($fingerprint !== $last) {
                    yield new StreamedEvent(event: 'orders', data: $payload);
                    $last = $fingerprint;
                }

                yield new StreamedEvent(event: 'ping', data: now()->toIso8601String());
                sleep(1);
            }
        });
    }

    public function kitchen(Request $r)
    {
        $restaurantId = $this->restaurantId($r);
        $q = DB::table('orders')
            ->join('dining_sessions', 'dining_sessions.id', '=', 'orders.dining_session_id')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('restaurant_tables.user_id', $restaurantId)
            ->whereIn('orders.status', ['pending', 'preparing', 'ready', 'served'])
            ->select('orders.*', 'restaurant_tables.label as table_label', 'dining_sessions.customer_name')
            ->orderBy('orders.submitted_at');
        $orders = $q->get();
        foreach ($orders as $o) {
            $o->items = $this->items($o->id);
        }

        return $this->out($orders);
    }

    public function status(Request $r, $id)
    {
        $v = $r->validate(['status' => 'required|in:pending,preparing,ready,served']);
        $restaurantId = $this->restaurantId($r);
        if (! $this->orderBelongsToRestaurant($id, $restaurantId)) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $n = DB::table('orders')->where('id', $id)->update([
            'status' => $v['status'],
            'ready_at' => $v['status'] === 'ready' ? now() : null,
            'updated_at' => now(),
        ]);

        return $n ? $this->out(DB::table('orders')->find($id)) : response()->json(['message' => 'Order not found'], 404);
    }

    public function owner(Request $r)
    {
        $restaurantId = $this->restaurantId($r);
        $q = DB::table('orders')
            ->join('dining_sessions', 'dining_sessions.id', '=', 'orders.dining_session_id')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('restaurant_tables.user_id', $restaurantId)
            ->select('orders.*', 'restaurant_tables.label as table_label', 'dining_sessions.customer_name')
            ->latest('orders.id');
        if ($r->query('status')) {
            $q->where('orders.status', $r->query('status'));
        }

        return $this->out($q->get());
    }

    public function cancel(Request $r, $id)
    {
        $v = $r->validate(['reason' => 'required|string|max:500']);
        if (! $this->orderItemBelongsToRestaurant($id, $this->restaurantId($r))) {
            return response()->json(['message' => 'Order item not found'], 404);
        }

        $n = DB::table('order_items')->where('id', $id)->update(['status' => 'cancelled', 'cancel_reason' => $v['reason'], 'updated_at' => now()]);

        return $n ? $this->out(DB::table('order_items')->find($id)) : response()->json(['message' => 'Order item not found'], 404);
    }

    public function reassign(Request $r, $id)
    {
        $v = $r->validate(['target_session_id' => 'required|integer|exists:dining_sessions,id']);
        $restaurantId = $this->restaurantId($r);

        if (! $this->orderItemBelongsToRestaurant($id, $restaurantId)) {
            return response()->json(['message' => 'Order item not found'], 404);
        }

        $targetBelongs = DB::table('dining_sessions')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('dining_sessions.id', $v['target_session_id'])
            ->where('restaurant_tables.user_id', $restaurantId)
            ->whereNull('dining_sessions.closed_at')
            ->exists();

        if (! $targetBelongs) {
            return response()->json(['message' => 'Target session not found'], 404);
        }

        $n = DB::table('order_items')->where('id', $id)->update(['reassigned_to_session_id' => $v['target_session_id'], 'status' => 'active', 'updated_at' => now()]);

        return $n ? $this->out(DB::table('order_items')->find($id)) : response()->json(['message' => 'Order item not found'], 404);
    }
}
