<?php

namespace App\Http\Controllers;

use App\Support\OrderWorkflow;
use App\Support\ResolvesRestaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    use ResolvesRestaurant;

    private function out($data, $status = 200)
    {
        return response()->json(['data' => $data], $status);
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

    private function orderItemForRestaurant($itemId, $restaurantId): ?object
    {
        return DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('dining_sessions', 'dining_sessions.id', '=', 'orders.dining_session_id')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('order_items.id', $itemId)
            ->where('restaurant_tables.user_id', $restaurantId)
            ->select('order_items.*', 'orders.dining_session_id', 'orders.status as order_status')
            ->first();
    }

    private function sessionOrders($sid)
    {
        $orders = DB::table('orders')->where('dining_session_id', $sid)->latest('id')->get();
        foreach ($orders as $o) {
            $o->items = OrderWorkflow::items($o->id);
            $o->orderNumber = $o->order_number ?? $o->id;
        }

        return $orders;
    }

    /**
     * US-10 / FR-15..17, FR-25: submit the cart as an order for an open session.
     * POST /api/public/sessions/{id}/orders (alias: /api/sessions/{id}/orders)
     */
    public function submit(Request $r, $sid)
    {
        $v = $r->validate([
            'items' => 'required|array|min:1',
            'items.*.menuItemId' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1|max:99',
            'items.*.note' => 'nullable|string|max:500',
        ], [
            'items.required' => 'Add at least one item before placing your order.',
            'items.min' => 'Add at least one item before placing your order.',
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
            ->whereNull('deleted_at')
            ->get()
            ->keyBy('id');

        if ($availableItems->count() !== $menuItemIds->count()) {
            return response()->json(['message' => 'One or more menu items are unavailable. Please refresh the menu and try again.'], 422);
        }

        $oid = DB::transaction(function () use ($v, $sid, $s, $availableItems) {
            $oid = OrderWorkflow::createOrder((int) $sid, (int) $s->user_id);
            $now = now();
            foreach ($v['items'] as $i) {
                $m = $availableItems->get($i['menuItemId']);
                DB::table('order_items')->insert([
                    'order_id' => $oid,
                    'menu_item_id' => $m->id,
                    'quantity' => $i['quantity'],
                    'unit_price' => $m->price,
                    'note' => $i['note'] ?? null,
                    'status' => 'active',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
            DB::table('dining_sessions')->where('id', $sid)->update(['status' => 'ordering', 'updated_at' => $now]);

            return $oid;
        });

        $o = DB::table('orders')->find($oid);
        $o->items = OrderWorkflow::items($oid);
        $o->orderNumber = $o->order_number;

        return $this->out($o, 201);
    }

    public function session($sid)
    {
        return $this->out($this->sessionOrders($sid));
    }

    /** Server-Sent Events feed of a session's orders (customer tracking, FR-20). */
    public function stream($sid)
    {
        return response()->stream(function () use ($sid) {
            $last = null;
            $startedAt = microtime(true);

            while (microtime(true) - $startedAt < 55) {
                $payload = json_encode($this->sessionOrders($sid)->values()->all(), JSON_UNESCAPED_UNICODE);
                $fingerprint = md5($payload);
                if ($fingerprint !== $last) {
                    // Double quotes are required: "\n" must be a real newline for SSE framing.
                    echo "event: orders\n";
                    echo 'data: '.$payload."\n\n";
                    $last = $fingerprint;
                }

                echo "event: ping\n";
                echo 'data: '.json_encode(now()->toIso8601String())."\n\n";
                if (function_exists('ob_flush')) {
                    @ob_flush();
                }
                flush();
                if (connection_aborted()) {
                    break;
                }
                sleep(1);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * US-12 / US-14: live kitchen queue with elapsed time, late flag and
     * expected prep time. ?sort_by=prepTime orders by least time remaining.
     */
    public function kitchen(Request $r)
    {
        $restaurantId = $this->restaurantId($r);
        $orders = DB::table('orders')
            ->join('dining_sessions', 'dining_sessions.id', '=', 'orders.dining_session_id')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('restaurant_tables.user_id', $restaurantId)
            ->where(function ($q) {
                $q->whereIn('orders.status', ['pending', 'preparing', 'ready'])
                    ->orWhere(function ($q) {
                        // Keep recently served orders visible for a short while only.
                        $q->where('orders.status', 'served')->where('orders.served_at', '>=', now()->subHours(2));
                    });
            })
            ->select('orders.*', 'restaurant_tables.label as table_label', 'dining_sessions.customer_name')
            ->orderBy('orders.submitted_at')
            ->get();

        $avg = OrderWorkflow::averagePrepMinutes($restaurantId);
        $orders = $orders
            ->map(fn ($o) => OrderWorkflow::presentForKitchen($o, $avg))
            ->filter(fn ($o) => count($o->items) > 0) // fully cancelled orders leave the queue (US-19)
            ->values();

        if ($r->query('sort_by') === 'prepTime') {
            $orders = $orders->sortBy(fn ($o) => [
                $o->rawStatus === 'served' ? 1 : 0,
                $o->expectedPrepMinutes - $o->elapsedMinutes,
            ])->values();
        }

        return $this->out($orders);
    }

    /** US-13 / FR-19, FR-23: forward-only status change with timestamped history. */
    public function status(Request $r, $id)
    {
        $r->merge(['status' => strtolower((string) $r->input('status'))]);
        $v = $r->validate(['status' => 'required|in:'.implode(',', OrderWorkflow::FLOW)]);
        $restaurantId = $this->restaurantId($r);
        if (! $this->orderBelongsToRestaurant($id, $restaurantId)) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        return DB::transaction(function () use ($r, $id, $v) {
            $order = DB::table('orders')->where('id', $id)->lockForUpdate()->first();
            if ($order->status === $v['status']) {
                return $this->out($order);
            }
            if (! OrderWorkflow::canTransition($order->status, $v['status'])) {
                return response()->json([
                    'message' => "Invalid status transition from {$order->status} to {$v['status']}.",
                    'code' => 'INVALID_STATUS_TRANSITION',
                ], 422);
            }

            $now = now();
            $update = ['status' => $v['status'], 'updated_at' => $now];
            $column = ['preparing' => 'preparing_at', 'ready' => 'ready_at', 'served' => 'served_at'][$v['status']];
            $update[$column] = $now;

            DB::table('orders')->where('id', $id)->update($update);
            OrderWorkflow::logStatus((int) $id, $order->status, $v['status'], $r->user()->id);

            return $this->out(DB::table('orders')->find($id));
        });
    }

    /** US-15 / FR-21: current and past orders, filterable by status and date range. */
    public function owner(Request $r)
    {
        $restaurantId = $this->restaurantId($r);
        $q = DB::table('orders')
            ->join('dining_sessions', 'dining_sessions.id', '=', 'orders.dining_session_id')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('restaurant_tables.user_id', $restaurantId)
            ->select(
                'orders.*',
                'restaurant_tables.label as table_label',
                'dining_sessions.customer_name',
                DB::raw("(SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) FROM order_items oi WHERE oi.order_id = orders.id AND oi.status = 'active') as total")
            )
            ->latest('orders.id');
        if ($r->query('status')) {
            $q->where('orders.status', strtolower($r->query('status')));
        }
        if ($r->query('from')) {
            $q->whereDate('orders.submitted_at', '>=', $r->query('from'));
        }
        if ($r->query('to')) {
            $q->whereDate('orders.submitted_at', '<=', $r->query('to'));
        }

        return $this->out($q->limit(500)->get());
    }

    /** US-15: order detail, tenant-scoped (403/404 across tenants). */
    public function show(Request $r, $id)
    {
        if (! $this->orderBelongsToRestaurant($id, $this->restaurantId($r))) {
            return response()->json(['message' => 'Order not found'], 404);
        }
        $o = DB::table('orders')->find($id);
        $o->items = OrderWorkflow::items($o->id);
        $o->history = DB::table('order_status_histories')->where('order_id', $id)->orderBy('id')->get();

        return $this->out($o);
    }

    /** US-19 / FR-34, FR-35: cancel an item with a mandatory reason, no approval step. */
    public function cancel(Request $r, $id)
    {
        $v = $r->validate(
            ['reason' => 'required|string|min:2|max:500'],
            ['reason.required' => 'A reason is required to cancel this item.']
        );
        $item = $this->orderItemForRestaurant($id, $this->restaurantId($r));
        if (! $item) {
            return response()->json(['message' => 'Order item not found'], 404);
        }
        if ($item->status === 'cancelled') {
            return response()->json(['message' => 'This item is already cancelled.'], 409);
        }

        DB::transaction(function () use ($r, $id, $v, $item) {
            DB::table('order_items')->where('id', $id)->update([
                'status' => 'cancelled',
                'cancel_reason' => trim($v['reason']),
                'cancelled_by' => $r->user()->id,
                'cancelled_at' => now(),
                'updated_at' => now(),
            ]);

            // When every item of the order is cancelled the order itself leaves the kitchen queue.
            $stillActive = DB::table('order_items')->where('order_id', $item->order_id)->where('status', 'active')->exists();
            if (! $stillActive && $item->order_status !== 'cancelled') {
                DB::table('orders')->where('id', $item->order_id)->update(['status' => 'cancelled', 'updated_at' => now()]);
                OrderWorkflow::logStatus((int) $item->order_id, $item->order_status, 'cancelled', $r->user()->id);
            }
        });

        return $this->out(DB::table('order_items')->find($id));
    }

    /**
     * US-20 / FR-33: move a cancelled item onto another active session. A new
     * order is created on the target session and linked back for audit; the
     * original stays cancelled so it is never billed twice.
     */
    public function reassign(Request $r, $id)
    {
        $v = $r->validate(['target_session_id' => 'required|integer']);
        $restaurantId = $this->restaurantId($r);

        $item = $this->orderItemForRestaurant($id, $restaurantId);
        if (! $item) {
            return response()->json(['message' => 'Order item not found'], 404);
        }
        if ($item->status !== 'cancelled') {
            return response()->json(['message' => 'Only cancelled items can be reassigned.'], 422);
        }
        if ($item->reassigned_to_session_id) {
            return response()->json(['message' => 'This item has already been reassigned.'], 409);
        }
        if ((int) $v['target_session_id'] === (int) $item->dining_session_id) {
            return response()->json(['message' => 'Choose a different table session.'], 422);
        }

        $targetActive = DB::table('dining_sessions')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('dining_sessions.id', $v['target_session_id'])
            ->where('restaurant_tables.user_id', $restaurantId)
            ->whereNull('dining_sessions.closed_at')
            ->exists();

        if (! $targetActive) {
            return response()->json(['message' => 'Target session not found or no longer active.'], 404);
        }

        $newItemId = DB::transaction(function () use ($id, $v, $item, $restaurantId) {
            $orderId = OrderWorkflow::createOrder((int) $v['target_session_id'], $restaurantId);
            $now = now();
            $newItemId = DB::table('order_items')->insertGetId([
                'order_id' => $orderId,
                'menu_item_id' => $item->menu_item_id,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'note' => $item->note,
                'status' => 'active',
                'reassigned_from_item_id' => $id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            DB::table('order_items')->where('id', $id)->update(['reassigned_to_session_id' => $v['target_session_id'], 'updated_at' => $now]);

            return $newItemId;
        });

        return $this->out([
            'original' => DB::table('order_items')->find($id),
            'reassigned' => DB::table('order_items')->find($newItemId),
        ], 201);
    }
}
