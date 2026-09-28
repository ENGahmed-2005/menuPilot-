<?php

namespace App\Http\Controllers;

use App\Enums\PaymentStatus;
use App\Support\Audit;
use App\Support\ResolvesRestaurant;
use App\Support\SessionLifecycle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Sprint 5 billing: bill request (US-16), combined bill, payment and session
 * close (US-17), manual adjustments and offline/USSD payments (US-18).
 */
class BillingController extends Controller
{
    use ResolvesRestaurant;

    private function out($d, $s = 200)
    {
        return response()->json(['data' => $d], $s);
    }

    private function sessionForRestaurant($sid, $restaurantId): ?object
    {
        return DB::table('dining_sessions')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('dining_sessions.id', $sid)
            ->where('restaurant_tables.user_id', $restaurantId)
            ->select('dining_sessions.*', 'restaurant_tables.label as table_label', 'restaurant_tables.user_id as restaurant_id')
            ->first();
    }

    /** Active items from every non-cancelled order in the session (FR-29). */
    private function billItems($sid)
    {
        return DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('menu_items', 'menu_items.id', '=', 'order_items.menu_item_id')
            ->where('orders.dining_session_id', $sid)
            ->where('orders.status', '!=', 'cancelled')
            ->where('order_items.status', 'active')
            ->select(
                'order_items.id',
                'order_items.order_id',
                'orders.order_number',
                'menu_items.name',
                'menu_items.category',
                'order_items.quantity',
                'order_items.unit_price',
                'order_items.note',
                DB::raw('(order_items.quantity * order_items.unit_price) as total')
            )
            ->orderBy('order_items.id')
            ->get();
    }

    private function summary(object $session): array
    {
        $items = $this->billItems($session->id);
        $total = round((float) $items->sum('total'), 2);
        $payments = DB::table('payments')->where('dining_session_id', $session->id)->orderBy('id')->get();
        $paid = round((float) $payments->whereIn('status', PaymentStatus::settled())->sum('amount'), 2);

        return [
            'session' => [
                'id' => $session->id,
                'status' => $session->status,
                'table_label' => $session->table_label ?? null,
                'customer_name' => $session->customer_name,
                'opened_at' => $session->opened_at,
                'closed_at' => $session->closed_at,
            ],
            'items' => $items,
            'adjustments' => DB::table('bill_adjustments')->where('dining_session_id', $session->id)->orderBy('id')->get(),
            'payments' => $payments,
            'total' => $total,
            'paid' => $paid,
            'outstanding' => max(0, round($total - $paid, 2)),
        ] + $this->lifecycleFields($session);
    }

    /** US-16 / FR-27, FR-28: customer asks for the bill from their phone. */
    public function request($sid)
    {
        $session = DB::table('dining_sessions')->find($sid);
        if (! $session) {
            return response()->json(['message' => 'Session not found'], 404);
        }
        if ($session->closed_at) {
            return response()->json(['message' => 'Dining session is closed.'], 409);
        }
        if (! DB::table('orders')->where('dining_session_id', $sid)->where('status', '!=', 'cancelled')->exists()) {
            return response()->json(['message' => 'Place at least one order before requesting the bill.'], 422);
        }

        DB::table('dining_sessions')->where('id', $sid)->update(['status' => 'bill_requested', 'updated_at' => now()]);

        return $this->out(['message' => 'Bill requested', 'status' => 'bill_requested']);
    }

    /**
     * GET /public/sessions/{id}/bill — the customer's own bill (session token
     * required by the route). Same numbers as the cashier sees, without staff
     * data (payer details, proofs, adjustment authors).
     */
    public function customerBill($sid)
    {
        $session = DB::table('dining_sessions')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('dining_sessions.id', $sid)
            ->select('dining_sessions.*', 'restaurant_tables.label as table_label', 'restaurant_tables.user_id as restaurant_id')
            ->first();
        if (! $session) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        $bill = $this->summary($session);

        return $this->out([
            'restaurant' => DB::table('users')->where('id', $session->restaurant_id)->value('restaurant_name'),
            'session' => [
                'id' => $session->id,
                'table_label' => $session->table_label,
                'opened_at' => $session->opened_at,
                'closed_at' => $session->closed_at,
                'bill_requested' => $session->status === 'bill_requested',
            ],
            'items' => collect($bill['items'])->map(fn ($i) => [
                'id' => $i->id,
                'order_number' => $i->order_number,
                'name' => $i->name,
                'quantity' => (int) $i->quantity,
                'unit_price' => (float) $i->unit_price,
                'total' => round((float) $i->total, 2),
                'note' => $i->note,
            ])->values(),
            'payments' => collect($bill['payments'])->map(fn ($p) => [
                'method' => $p->method,
                'status' => $p->status,
                'amount' => (float) $p->amount,
            ])->values(),
            'total' => $bill['total'],
            'paid' => $bill['paid'],
            'outstanding' => $bill['outstanding'],
            'lifecycle' => $bill['lifecycle'],
        ]);
    }

    /** US-17 / FR-29: combined bill for all session orders. */
    public function bill(Request $request, $sid)
    {
        $session = $this->sessionForRestaurant($sid, $this->restaurantId($request));
        if (! $session) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        return $this->out($this->summary($session));
    }

    /**
     * US-17 / US-18 / FR-30, FR-37: record payment of the outstanding amount.
     * USSD payments are flagged "pending_reconciliation". By default the session
     * is closed in the same step (close=false records the payment only).
     */
    public function pay(Request $r, $sid)
    {
        $v = $r->validate([
            'method' => 'required|in:cash,electronic,ussd',
            'close' => 'sometimes|boolean',
        ]);
        $restaurantId = $this->restaurantId($r);
        $session = $this->sessionForRestaurant($sid, $restaurantId);
        if (! $session) {
            return response()->json(['message' => 'Session not found'], 404);
        }
        if ($session->closed_at) {
            return response()->json(['message' => 'Session already closed'], 409);
        }

        // Guard: if a customer-submitted payment is still pending verification,
        // the cashier must verify or reject it first before recording another payment.
        $pendingCustomerPayment = DB::table('payments')
            ->where('dining_session_id', $session->id)
            ->where('status', PaymentStatus::Pending->value)
            ->exists();
        if ($pendingCustomerPayment) {
            return response()->json(['message' => 'يوجد طلب دفع من العميل قيد المراجعة. يرجى تأكيده أو رفضه أولاً.'], 409);
        }

        $result = DB::transaction(function () use ($r, $v, $session, $restaurantId) {
            $outstanding = $this->summary($session)['outstanding'];
            $isUssd = $v['method'] === 'ussd';
            $now = now();

            $paymentId = DB::table('payments')->insertGetId([
                'dining_session_id' => $session->id,
                'method' => $v['method'],
                'status' => $isUssd ? PaymentStatus::PendingReconciliation->value : PaymentStatus::Verified->value,
                'reconciliation_status' => $isUssd ? 'pending' : null,
                'amount' => $outstanding,
                'paid_at' => $now,
                'verified_at' => $isUssd ? null : $now,
                'verified_by' => $isUssd ? null : $r->user()->id,
                'recorded_by' => $r->user()->id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            Audit::log($r, 'payment.recorded', 'payment', $paymentId, ['session_id' => $session->id, 'method' => $v['method'], 'amount' => $outstanding], $restaurantId);
            if ($v['close'] ?? true) {
                $this->closeSession($session, $restaurantId, $r->user()->id);
                Audit::log($r, 'session.closed', 'dining_session', $session->id, ['table' => $session->table_label, 'via' => 'payment'], $restaurantId);
            }

            return DB::table('payments')->find($paymentId);
        });

        return $this->out($result, 201);
    }

    /** US-17 / FR-31, FR-32: close only after payment; table returns to Available. */
    /**
     * US-17 / FR-31, FR-32: close a dining session (permission: close_session).
     * Allowed only when nothing is outstanding, no customer payment is waiting
     * for verification, and a payment was recorded if there was a bill.
     * Closing resolves open waiter calls and makes the table available.
     * The session row is locked so two cashiers can't close it twice.
     */
    public function close(Request $r, $sid)
    {
        $restaurantId = $this->restaurantId($r);
        if (! $this->sessionForRestaurant($sid, $restaurantId)) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        $result = DB::transaction(function () use ($r, $sid, $restaurantId) {
            DB::table('dining_sessions')->where('id', $sid)->lockForUpdate()->first();
            $session = $this->sessionForRestaurant($sid, $restaurantId);
            $money = SessionLifecycle::summaries([(int) $sid])[(int) $sid];

            if ($blocker = SessionLifecycle::closeBlocker($session, $money)) {
                return response()->json([
                    'message' => $blocker['message'],
                    'code' => $blocker['code'],
                    'outstanding' => $money['outstanding'],
                ], $blocker['status']);
            }

            $this->closeSession($session, $restaurantId, $r->user()->id);
            Audit::log($r, 'session.closed', 'dining_session', (int) $sid, [
                'table' => $session->table_label,
                'total' => $money['total'],
                'paid' => $money['paid'],
            ], $restaurantId);

            return null;
        });

        return $result ?? $this->out(DB::table('dining_sessions')->find($sid));
    }

    /** Mark a USSD/offline payment as reconciled once connectivity is back (US-18). */
    public function reconcile(Request $r, $paymentId)
    {
        $payment = DB::table('payments')
            ->join('dining_sessions', 'dining_sessions.id', '=', 'payments.dining_session_id')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('payments.id', $paymentId)
            ->where('restaurant_tables.user_id', $this->restaurantId($r))
            ->select('payments.*')
            ->first();
        if (! $payment) {
            return response()->json(['message' => 'Payment not found'], 404);
        }
        if ($payment->status !== PaymentStatus::PendingReconciliation->value) {
            return response()->json(['message' => 'Payment is not awaiting reconciliation.'], 409);
        }

        DB::table('payments')->where('id', $paymentId)->update([
            'status' => PaymentStatus::Verified->value,
            'reconciliation_status' => 'reconciled',
            'verified_at' => now(),
            'verified_by' => $r->user()->id,
            'updated_at' => now(),
        ]);
        Audit::log($r, 'payment.reconciled', 'payment', (int) $paymentId, ['amount' => $payment->amount], $this->restaurantId($r));

        return $this->out(DB::table('payments')->find($paymentId));
    }

    /** US-18 / FR-36: manual price adjustment with full audit trail. */
    public function adjust(Request $r, $sid, $item)
    {
        $v = $r->validate([
            'new_price' => 'required|numeric|min:0',
            'reason' => 'nullable|string|max:255',
        ]);
        $session = $this->sessionForRestaurant($sid, $this->restaurantId($r));
        if (! $session) {
            return response()->json(['message' => 'Session not found'], 404);
        }
        if ($session->closed_at) {
            return response()->json(['message' => 'Session already closed'], 409);
        }

        $x = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('order_items.id', $item)
            ->where('orders.dining_session_id', $sid)
            ->where('order_items.status', 'active')
            ->select('order_items.*')
            ->first();
        if (! $x) {
            return response()->json(['message' => 'Bill item not found'], 404);
        }

        DB::transaction(function () use ($r, $v, $sid, $item, $x) {
            DB::table('bill_adjustments')->insert([
                'dining_session_id' => $sid,
                'order_item_id' => $item,
                'old_price' => $x->unit_price,
                'new_price' => $v['new_price'],
                'reason' => $v['reason'] ?? null,
                'cashier_id' => $r->user()->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('order_items')->where('id', $item)->update(['unit_price' => $v['new_price'], 'updated_at' => now()]);
        });
        Audit::log($r, 'bill.price_adjusted', 'order_item', (int) $item, ['session_id' => (int) $sid, 'old_price' => $x->unit_price, 'new_price' => $v['new_price'], 'reason' => $v['reason'] ?? null], $session->restaurant_id);

        return $this->out($this->summary($session));
    }

    private function lifecycleFields(object $session): array
    {
        $money = SessionLifecycle::summaries([(int) $session->id])[(int) $session->id];
        $fields = SessionLifecycle::present($session, $money);

        return ['lifecycle' => $fields['lifecycle'], 'can_close' => $fields['canClose'], 'close_blocker' => $fields['closeBlocker'], 'has_pending_payment' => $fields['hasPendingPayment']];
    }

    private function closeSession(object $session, int $restaurantId, ?int $closedBy = null): void
    {
        SessionLifecycle::closeNow($session, $restaurantId, $closedBy);
    }
}
