<?php

namespace App\Support;

use App\Enums\PaymentStatus;
use Illuminate\Support\Facades\DB;

/**
 * One definition of where a dining session is in its life, derived from the
 * data (orders, bill, payments) instead of a second stored status that could
 * drift from it. The stored dining_sessions.status keeps its existing values
 * (open/ordering/payment_pending/bill_requested/closed) for compatibility.
 *
 *   open            no orders yet
 *   active          ordering / eating
 *   bill_requested  customer asked for the bill
 *   payment_pending a customer payment is waiting for cashier verification
 *   paid            nothing outstanding, ready to close
 *   closed          closed_at is set (table is available again)
 *
 * can_close = not closed, no payment pending verification, outstanding = 0,
 * and at least one settled payment when there was anything to pay.
 */
class SessionLifecycle
{
    /** Money summary for many sessions in three queries. */
    public static function summaries(array $sessionIds): array
    {
        if (! $sessionIds) {
            return [];
        }

        $totals = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereIn('orders.dining_session_id', $sessionIds)
            ->where('orders.status', '!=', 'cancelled')
            ->where('order_items.status', 'active')
            ->groupBy('orders.dining_session_id')
            ->select('orders.dining_session_id as sid', DB::raw('SUM(order_items.quantity * order_items.unit_price) as total'))
            ->pluck('total', 'sid');

        $payments = DB::table('payments')
            ->whereIn('dining_session_id', $sessionIds)
            ->groupBy('dining_session_id')
            ->select(
                'dining_session_id as sid',
                DB::raw("SUM(CASE WHEN status IN ('".implode("','", PaymentStatus::settled())."') THEN amount ELSE 0 END) as paid"),
                DB::raw("SUM(CASE WHEN status IN ('".implode("','", PaymentStatus::settled())."') THEN 1 ELSE 0 END) as settled_count"),
                DB::raw("SUM(CASE WHEN status = '".PaymentStatus::Pending->value."' THEN 1 ELSE 0 END) as pending_count")
            )
            ->get()->keyBy('sid');

        $orders = DB::table('orders')->whereIn('dining_session_id', $sessionIds)->where('status', '!=', 'cancelled')
            ->groupBy('dining_session_id')->select('dining_session_id as sid', DB::raw('COUNT(*) as n'))->pluck('n', 'sid');

        $out = [];
        foreach ($sessionIds as $id) {
            $total = round((float) ($totals[$id] ?? 0), 2);
            $p = $payments[$id] ?? null;
            $paid = round((float) ($p->paid ?? 0), 2);
            $out[$id] = [
                'total' => $total,
                'paid' => $paid,
                'outstanding' => max(0, round($total - $paid, 2)),
                'has_orders' => (int) ($orders[$id] ?? 0) > 0,
                'has_settled_payment' => (int) ($p->settled_count ?? 0) > 0,
                'has_pending_payment' => (int) ($p->pending_count ?? 0) > 0,
            ];
        }

        return $out;
    }

    public static function resolve(object $session, array $summary): string
    {
        if ($session->closed_at) {
            return 'closed';
        }
        if ($summary['has_pending_payment']) {
            return 'payment_pending';
        }
        if ($summary['total'] > 0 && $summary['outstanding'] <= 0 && $summary['has_settled_payment']) {
            return 'paid';
        }
        if ($session->status === 'bill_requested') {
            return 'bill_requested';
        }

        return $summary['has_orders'] ? 'active' : 'open';
    }

    /** Why a session can't be closed yet (null when it can). */
    public static function closeBlocker(object $session, array $summary): ?array
    {
        if ($session->closed_at) {
            return ['code' => 'SESSION_ALREADY_CLOSED', 'status' => 409, 'message' => 'هذه الجلسة مغلقة بالفعل.'];
        }
        if ($summary['has_pending_payment']) {
            return ['code' => 'PAYMENT_PENDING_VERIFICATION', 'status' => 409, 'message' => 'يوجد دفع من الزبون بانتظار التأكيد. أكّده أو ارفضه قبل إغلاق الجلسة.'];
        }
        if ($summary['outstanding'] > 0) {
            return ['code' => 'OUTSTANDING_BALANCE', 'status' => 422, 'message' => 'لا يمكن إغلاق الجلسة قبل دفع المبلغ المتبقي.'];
        }
        if ($summary['total'] > 0 && ! $summary['has_settled_payment']) {
            return ['code' => 'PAYMENT_REQUIRED', 'status' => 422, 'message' => 'سجّل الدفع قبل إغلاق الجلسة.'];
        }

        return null;
    }

    /**
     * Close a session: closed_at, resolve open waiter calls, free the table.
     * Callers handle permission, blockers, locking and audit.
     */
    public static function closeNow(object $session, int $restaurantId, ?int $closedBy = null): void
    {
        $now = now();
        DB::table('dining_sessions')->where('id', $session->id)->update(array_filter([
            'status' => 'closed', 'closed_at' => $now, 'updated_at' => $now, 'closed_by' => $closedBy,
        ], fn ($v) => $v !== null));
        DB::table('assistance_requests')->where('dining_session_id', $session->id)->where('status', 'open')
            ->update(['status' => 'resolved', 'resolved_at' => $now, 'updated_at' => $now]);
        DB::table('restaurant_tables')->where('id', $session->restaurant_table_id)->where('user_id', $restaurantId)
            ->update(['status' => 'available', 'updated_at' => $now]);
    }

    /** Fields added to session payloads for staff screens. */
    public static function present(object $session, array $summary): array
    {
        $blocker = self::closeBlocker($session, $summary);

        return [
            'lifecycle' => self::resolve($session, $summary),
            'billTotal' => $summary['total'],
            'paidTotal' => $summary['paid'],
            'outstanding' => $summary['outstanding'],
            'hasPendingPayment' => $summary['has_pending_payment'],
            'canClose' => $blocker === null,
            'closeBlocker' => $blocker['code'] ?? null,
        ];
    }
}
