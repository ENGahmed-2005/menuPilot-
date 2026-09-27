<?php

namespace App\Support;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Shared order rules: sequential numbering (US-10), forward-only kitchen
 * transitions with history (US-13, FR-23) and prep-time metrics (US-14).
 */
class OrderWorkflow
{
    /** Kitchen lifecycle, in order. */
    public const FLOW = ['pending', 'preparing', 'ready', 'served'];

    public const DEFAULT_PREP_MINUTES = 15;

    /**
     * Next sequential order number for a restaurant. Must be called inside a
     * transaction; the restaurant row is locked to serialise concurrent orders.
     */
    public static function nextNumber(int $restaurantId): int
    {
        DB::table('users')->where('id', $restaurantId)->lockForUpdate()->first();

        return ((int) DB::table('orders')->where('user_id', $restaurantId)->max('order_number')) + 1;
    }

    /** Create an order row with its number and first history entry. */
    public static function createOrder(int $sessionId, int $restaurantId, string $status = 'pending'): int
    {
        $now = now();
        $id = DB::table('orders')->insertGetId([
            'dining_session_id' => $sessionId,
            'user_id' => $restaurantId,
            'order_number' => self::nextNumber($restaurantId),
            'status' => $status,
            'submitted_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        self::logStatus($id, null, $status, null);

        return $id;
    }

    public static function logStatus(int $orderId, ?string $from, string $to, ?int $userId): void
    {
        DB::table('order_status_histories')->insert([
            'order_id' => $orderId,
            'from_status' => $from,
            'to_status' => $to,
            'changed_by' => $userId,
            'created_at' => now(),
        ]);
    }

    /** Only the next step in the flow is allowed (no skipping, no going back). */
    public static function canTransition(string $from, string $to): bool
    {
        $i = array_search($from, self::FLOW, true);

        return $i !== false && ($i + 1) < count(self::FLOW) && self::FLOW[$i + 1] === $to;
    }

    /**
     * Average minutes from submission to "ready" for the restaurant over the
     * last 30 days; falls back to the default when there is no history yet.
     */
    public static function averagePrepMinutes(int $restaurantId): int
    {
        $rows = DB::table('orders')
            ->where('user_id', $restaurantId)
            ->whereNotNull('ready_at')
            ->where('submitted_at', '>=', now()->subDays(30))
            ->select('submitted_at', 'ready_at')
            ->limit(500)
            ->get();

        if ($rows->isEmpty()) {
            return self::DEFAULT_PREP_MINUTES;
        }

        $avg = $rows->avg(fn ($r) => Carbon::parse($r->submitted_at)->diffInSeconds(Carbon::parse($r->ready_at)) / 60);

        return max(1, (int) round($avg));
    }

    /** Active (non-cancelled) items of an order, with the menu item name. */
    public static function items(int $orderId)
    {
        return DB::table('order_items')
            ->join('menu_items', 'menu_items.id', '=', 'order_items.menu_item_id')
            ->where('order_items.order_id', $orderId)
            ->select('order_items.*', 'menu_items.name', DB::raw('COALESCE(menu_items.prep_time_minutes, '.self::DEFAULT_PREP_MINUTES.') as prep_time_minutes'))
            ->orderBy('order_items.id')
            ->get();
    }

    /**
     * Kitchen-facing shape. Keeps the original snake_case columns and adds the
     * camelCase keys the React dashboard reads (status capitalised to match its flow).
     */
    public static function presentForKitchen(object $order, int $avgPrep): object
    {
        $items = self::items($order->id);
        $active = $items->where('status', 'active')->values();
        $expected = (int) ($active->max('prep_time_minutes') ?? self::DEFAULT_PREP_MINUTES);
        $submitted = Carbon::parse($order->submitted_at);

        $order->items = $active->map(fn ($i) => (object) [
            'id' => $i->id,
            'name' => $i->name,
            'quantity' => (int) $i->quantity,
            'note' => $i->note,
            'unit_price' => $i->unit_price,
        ])->all();
        $order->orderNumber = $order->order_number ?? $order->id;
        $order->tableLabel = $order->table_label ?? null;
        $order->customerName = $order->customer_name ?? null;
        $order->submittedAt = $submitted->toIso8601String();
        $order->elapsedMinutes = (int) $submitted->diffInMinutes(now());
        $order->expectedPrepMinutes = $expected;
        $order->avgPrepTimeMinutes = $avgPrep;
        $order->isLate = $order->status !== 'served' && $order->elapsedMinutes > $avgPrep;
        $order->rawStatus = $order->status;
        $order->status = ucfirst($order->status);

        return $order;
    }
}
