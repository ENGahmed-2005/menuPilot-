<?php
namespace App\Http\Controllers;
use App\Models\DiningSession; use App\Models\OrderItem; use Illuminate\Http\Request;
class BillingController extends Controller {
 private function sessionForOwner(Request $r,int $id):DiningSession{return DiningSession::where('restaurant_id',$r->user()->restaurant_id)->findOrFail($id);}
 private function bill(DiningSession $s):array{$s->load('orders.items.product');$items=[];$total=0;foreach($s->orders as $o){foreach($o->items as $i){if(strtolower($i->status)==='cancelled')continue;$line=(float)$i->unit_price*(int)$i->quantity;$total+=$line;$items[]=['id'=>$i->id,'order_id'=>$o->id,'product_id'=>$i->product_id,'name'=>$i->product?->name,'quantity'=>$i->quantity,'unit_price'=>(float)$i->unit_price,'total'=>$line];}}return ['session_id'=>$s->id,'items'=>$items,'total'=>round($total,2),'status'=>$s->status];}
 public function requestBill(int $id){$s=DiningSession::findOrFail($id);if($s->status==='Closed')return response()->json(['message'=>'الجلسة مغلقة'],409);$s->update(['status'=>'Bill Requested']);return response()->json(['message'=>'تم طلب الفاتورة','data'=>$this->bill($s)]);}
 public function show(Request $r,int $id){return response()->json(['data'=>$this->bill($this->sessionForOwner($r,$id))]);}
 public function payment(Request $r,int $id){$d=$r->validate(['method'=>'required|in:cash,electronic,ussd']);$s=$this->sessionForOwner($r,$id);if($s->status==='Closed')return response()->json(['message'=>'الجلسة مغلقة'],409);$s->update(['status'=>'Closed','closed_at'=>now()]);return response()->json(['message'=>'تم تسجيل الدفع وإغلاق الجلسة','payment_method'=>$d['method'],'data'=>$this->bill($s)]);}
 public function adjust(Request $r,int $sid,int $iid){$s=$this->sessionForOwner($r,$sid);$i=OrderItem::where('id',$iid)->whereHas('order',fn($q)=>$q->where('dining_session_id',$s->id))->firstOrFail();$d=$r->validate(['unit_price'=>'required|numeric|min:0']);$i->update(['unit_price'=>$d['unit_price']]);return response()->json(['data'=>$this->bill($s)]);}
}
