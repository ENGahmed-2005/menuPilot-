<?php
namespace App\Http\Controllers;

use App\Models\DiningSession;
use App\Models\OrderItem;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    private function sessionForOwner(Request $request, int $id): DiningSession
    {
        return DiningSession::where('restaurant_id', $request->user()->restaurant_id)
            ->findOrFail($id);
    }

    private function bill(DiningSession $session): array
    {
        $session->load('orders.items.product');
        $items = [];
        $total = 0;
        foreach ($session->orders as $order) {
            foreach ($order->items as $item) {
                if ($item->status === 'cancelled') continue;
                $line = (float) $item->unit_price * (int) $item->quantity;
                $total += $line;
                $items[] = [
                    'id' => $item->id,
                    'order_id' => $order->id,
                    'product_id' => $item->product_id,
                    'name' => $item->product?->name,
                    'quantity' => $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'total' => $line,
                ];
            }
        }
        return ['session_id'=>$session->id,'items'=>$items,'total'=>round($total,2),'status'=>$session->status];
    }

    public function requestBill(int $id)
    {
        $session = DiningSession::findOrFail($id);
        if ($session->status === 'Closed') return response()->json(['message'=>'الجلسة مغلقة'],409);
        $session->update(['status'=>'Bill Requested']);
        return response()->json(['message'=>'تم طلب الفاتورة','data'=>$this->bill($session)]);
    }

    public function show(Request $request, int $id)
    {
        return response()->json(['data'=>$this->bill($this->sessionForOwner($request,$id))]);
    }

    public function payment(Request $request, int $id)
    {
        $data = $request->validate(['method'=>'required|in:cash,electronic,ussd']);
        $session = $this->sessionForOwner($request,$id);
        if ($session->status === 'Closed') return response()->json(['message'=>'الجلسة مغلقة'],409);
        $session->update(['status'=>'Closed','closed_at'=>now()]);
        return response()->json(['message'=>'تم تسجيل الدفع وإغلاق الجلسة','payment_method'=>$data['method'],'data'=>$this->bill($session)]);
    }

    public function adjust(Request $request, int $sessionId, int $itemId)
    {
        $session = $this->sessionForOwner($request,$sessionId);
        $item = OrderItem::where('id',$itemId)->whereHas('order',fn($q)=>$q->where('dining_session_id',$session->id))->firstOrFail();
        $data = $request->validate(['unit_price'=>'required|numeric|min:0']);
        $item->update(['unit_price'=>$data['unit_price']]);
        return response()->json(['data'=>$this->bill($session)]);
    }
}
