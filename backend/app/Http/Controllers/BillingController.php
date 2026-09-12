<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BillingController extends Controller
{
    private function out($d, $s = 200)
    {
        return response()->json(['data' => $d], $s);
    }

    private function restaurantId(Request $request): int
    {
        $user = $request->user();
        if ($user->role === 'owner' || $user->role === 'admin') {
            return (int) $user->id;
        }

        return (int) Staff::where('account_user_id', $user->id)->value('user_id');
    }

    private function sessionBelongsToRestaurant($sid, $restaurantId): bool
    {
        return DB::table('dining_sessions')
            ->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
            ->where('dining_sessions.id', $sid)
            ->where('restaurant_tables.user_id', $restaurantId)
            ->exists();
    }

    private function total($sid)
    {
        $x = DB::table('order_items')->join('orders', 'orders.id', '=', 'order_items.order_id')->where('orders.dining_session_id', $sid)->where('order_items.status', 'active')->select(DB::raw('SUM(order_items.quantity*order_items.unit_price) total'))->first();

        return $x->total ?? 0;
    }

    public function request($sid)
    {
        if (! DB::table('dining_sessions')->find($sid)) {
            return response()->json(['message' => 'Session not found'], 404);
        }
        DB::table('dining_sessions')->where('id', $sid)->update(['status' => 'bill_requested', 'updated_at' => now()]);

        return $this->out(['message' => 'Bill requested']);
    }

    public function bill(Request $request, $sid)
    {
        if (! $this->sessionBelongsToRestaurant($sid, $this->restaurantId($request))) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        $items = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('menu_items', 'menu_items.id', '=', 'order_items.menu_item_id')
            ->where('orders.dining_session_id', $sid)
            ->where('order_items.status', 'active')
            ->select('order_items.id', 'menu_items.name', 'order_items.quantity', 'order_items.unit_price', DB::raw('(order_items.quantity*order_items.unit_price) as total'))
            ->get();

        return $this->out(['items' => $items, 'total' => $items->sum('total')]);
    }

    public function pay(Request $r, $sid)
    {
        $v = $r->validate(['method' => 'required|in:cash,electronic,ussd']);
        $s = DB::table('dining_sessions')->find($sid);
        if (! $s) {
            return response()->json(['message' => 'Session not found'], 404);
        }
        if (! $this->sessionBelongsToRestaurant($sid, $this->restaurantId($r))) {
            return response()->json(['message' => 'Session not found'], 404);
        }
        if ($s->closed_at) {
            return response()->json(['message' => 'Session already closed'], 409);
        }

        $amount = $this->total($sid);
        $id = DB::table('payments')->insertGetId(['dining_session_id' => $sid, 'method' => $v['method'], 'amount' => $amount, 'paid_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        DB::table('dining_sessions')->where('id', $sid)->update(['status' => 'closed', 'closed_at' => now(), 'updated_at' => now()]);
        DB::table('restaurant_tables')->where('id', $s->restaurant_table_id)->where('user_id', $this->restaurantId($r))->update(['status' => 'available', 'updated_at' => now()]);

        return $this->out(DB::table('payments')->find($id), 201);
    }

    public function adjust(Request $r, $sid, $item)
    {
        $v = $r->validate(['new_price' => 'required|numeric|min:0']);
        if (! $this->sessionBelongsToRestaurant($sid, $this->restaurantId($r))) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        $x = DB::table('order_items')->join('orders', 'orders.id', '=', 'order_items.order_id')->where('order_items.id', $item)->where('orders.dining_session_id', $sid)->select('order_items.*')->first();
        if (! $x) {
            return response()->json(['message' => 'Bill item not found'], 404);
        }
        DB::table('bill_adjustments')->insert(['dining_session_id' => $sid, 'order_item_id' => $item, 'old_price' => $x->unit_price, 'new_price' => $v['new_price'], 'cashier_id' => $r->user()->id, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('order_items')->where('id', $item)->update(['unit_price' => $v['new_price'], 'updated_at' => now()]);

        return $this->out(DB::table('order_items')->find($item));
    }
}
