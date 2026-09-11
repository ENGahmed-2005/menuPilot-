<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController
{
    private function out($data, $status = 200) { return response()->json(['data' => $data], $status); }

    private function sessionWithRestaurant($sessionId)
    {
        return DB::table('dining_sessions')->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')->join('users', 'users.id', '=', 'restaurant_tables.user_id')->where('dining_sessions.id', $sessionId)->select('dining_sessions.*', 'restaurant_tables.user_id as restaurant_user_id', 'users.payment_methods')->first();
    }

    private function total($orderId) { return (float) DB::table('order_items')->where('order_id', $orderId)->sum(DB::raw('quantity * unit_price')); }

    public function options($sessionId)
    {
        $session = $this->sessionWithRestaurant($sessionId);
        if (!$session) return response()->json(['message' => 'Session not found'], 404);
        $configured = is_array($session->payment_methods) ? $session->payment_methods : (json_decode($session->payment_methods ?? '[]', true) ?: []);
        return $this->out([
            'cash' => ['id' => 'cash', 'name' => 'كاش بمساعدة النادل', 'enabled' => true],
            'bank' => ['id' => 'bank', 'name' => $configured['bank']['name'] ?? 'تحويل بنكي', 'enabled' => (bool) ($configured['bank']['enabled'] ?? false), 'account_name' => $configured['bank']['account_name'] ?? null, 'account_number' => $configured['bank']['account_number'] ?? null, 'qr_url' => $configured['bank']['qr_url'] ?? null],
            'wallet' => ['id' => 'wallet', 'name' => $configured['wallet']['name'] ?? 'محفظة إلكترونية', 'enabled' => (bool) ($configured['wallet']['enabled'] ?? false), 'account_name' => $configured['wallet']['account_name'] ?? null, 'account_number' => $configured['wallet']['account_number'] ?? null, 'qr_url' => $configured['wallet']['qr_url'] ?? null],
        ]);
    }

    public function submit(Request $request, $sessionId)
    {
        $payload = $request->all();
        $payload['items'] = json_decode($request->input('items', '[]'), true);
        $v = validator($payload, [
            'items' => 'required|array|min:1', 'items.*.menuItemId' => 'required|integer', 'items.*.quantity' => 'required|integer|min:1', 'items.*.note' => 'nullable|string|max:500',
            'method' => 'required|in:cash,bank,wallet', 'provider' => 'nullable|string|max:100', 'payer_name' => 'required|string|min:2|max:255', 'payer_phone' => 'required|string|min:7|max:50', 'proof' => 'nullable|file|mimes:jpg,jpeg,png,webp,pdf|max:5120',
        ])->validate();

        $session = $this->sessionWithRestaurant($sessionId);
        if (!$session) return response()->json(['message' => 'Session not found'], 404);
        if ($session->closed_at) return response()->json(['message' => 'جلسة الطعام مغلقة.'], 409);
        $configured = is_array($session->payment_methods) ? $session->payment_methods : (json_decode($session->payment_methods ?? '[]', true) ?: []);
        if ($v['method'] !== 'cash' && !($configured[$v['method']]['enabled'] ?? false)) return response()->json(['message' => 'طريقة الدفع هذه غير مفعلة من المطعم.'], 422);

        $proofPath = $request->hasFile('proof') ? $request->file('proof')->store('payment-proofs', 'public') : null;
        $result = DB::transaction(function () use ($v, $sessionId, $session, $proofPath) {
            $orderId = DB::table('orders')->insertGetId(['dining_session_id' => $sessionId, 'user_id' => $session->restaurant_user_id, 'status' => 'payment_pending', 'submitted_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
            $validItems = 0;
            foreach ($v['items'] as $item) {
                $menuItem = DB::table('menu_items')->where('id', $item['menuItemId'])->where('user_id', $session->restaurant_user_id)->where('is_available', true)->first();
                if (!$menuItem) continue;
                $validItems++;
                DB::table('order_items')->insert(['order_id' => $orderId, 'menu_item_id' => $menuItem->id, 'quantity' => $item['quantity'], 'unit_price' => $menuItem->price, 'note' => $item['note'] ?? null, 'status' => 'active', 'created_at' => now(), 'updated_at' => now()]);
            }
            if ($validItems === 0) abort(422, 'لا توجد أصناف متاحة في الطلب.');
            $paymentId = DB::table('payments')->insertGetId(['dining_session_id' => $sessionId, 'order_id' => $orderId, 'method' => $v['method'], 'status' => 'pending', 'provider' => $v['provider'] ?? null, 'payer_name' => trim($v['payer_name']), 'payer_phone' => trim($v['payer_phone']), 'proof_path' => $proofPath, 'amount' => $this->total($orderId), 'created_at' => now(), 'updated_at' => now()]);
            DB::table('dining_sessions')->where('id', $sessionId)->update(['status' => 'payment_pending', 'updated_at' => now()]);
            return ['order' => DB::table('orders')->find($orderId), 'payment' => DB::table('payments')->find($paymentId)];
        });
        return $this->out($result, 201);
    }

    public function pending(Request $request)
    {
        $payments = DB::table('payments')->join('orders', 'orders.id', '=', 'payments.order_id')->join('dining_sessions', 'dining_sessions.id', '=', 'payments.dining_session_id')->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')->where('restaurant_tables.user_id', $request->user()->id)->where('payments.status', 'pending')->select('payments.*', 'orders.status as order_status', 'restaurant_tables.label as table_label', 'dining_sessions.customer_name')->latest('payments.id')->get();
        return $this->out($payments);
    }

    public function verify(Request $request, $id)
    {
        $payment = DB::table('payments')->join('dining_sessions', 'dining_sessions.id', '=', 'payments.dining_session_id')->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')->where('payments.id', $id)->where('restaurant_tables.user_id', $request->user()->id)->select('payments.*')->first();
        if (!$payment) return response()->json(['message' => 'Payment not found'], 404);
        if ($payment->status !== 'pending') return response()->json(['message' => 'Payment already processed'], 409);
        DB::transaction(function () use ($payment, $request) {
            DB::table('payments')->where('id', $payment->id)->update(['status' => 'verified', 'paid_at' => now(), 'verified_at' => now(), 'verified_by' => $request->user()->id, 'updated_at' => now()]);
            DB::table('orders')->where('id', $payment->order_id)->update(['status' => 'pending', 'updated_at' => now()]);
            DB::table('dining_sessions')->where('id', $payment->dining_session_id)->update(['status' => 'ordering', 'updated_at' => now()]);
        });
        return $this->out(DB::table('payments')->find($payment->id));
    }

    public function reject(Request $request, $id)
    {
        $v = $request->validate(['reason' => 'required|string|max:500']);
        $payment = DB::table('payments')->join('dining_sessions', 'dining_sessions.id', '=', 'payments.dining_session_id')->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')->where('payments.id', $id)->where('restaurant_tables.user_id', $request->user()->id)->select('payments.*')->first();
        if (!$payment) return response()->json(['message' => 'Payment not found'], 404);
        if ($payment->status !== 'pending') return response()->json(['message' => 'Payment already processed'], 409);
        DB::table('payments')->where('id', $payment->id)->update(['status' => 'rejected', 'rejection_reason' => $v['reason'], 'updated_at' => now()]);
        DB::table('orders')->where('id', $payment->order_id)->update(['status' => 'cancelled', 'updated_at' => now()]);
        return $this->out(DB::table('payments')->find($payment->id));
    }
}
