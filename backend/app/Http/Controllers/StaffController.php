<?php
namespace App\Http\Controllers;
use App\Models\Owner;
use Illuminate\Http\Request;
class StaffController extends Controller {
 private function owner(Request $r):void{abort_unless($r->user()->role==='owner',403,'غير مسموح.');}
 public function index(Request $r){$this->owner($r);return Owner::where('restaurant_id',$r->user()->restaurant_id)->where('role','!=','owner')->latest()->get(['id','name','email','role','active','created_at']);}
 public function store(Request $r){$this->owner($r);$d=$r->validate(['name'=>'required|string|max:255','email'=>'required|email|unique:owners,email','password'=>'required|string|min:8','role'=>'required|in:kitchen,cashier,waiter']);$d['restaurant_id']=$r->user()->restaurant_id;return Owner::create($d);}
 public function update(Request $r,int $id){$this->owner($r);$u=Owner::where('restaurant_id',$r->user()->restaurant_id)->where('role','!=','owner')->findOrFail($id);$d=$r->validate(['name'=>'sometimes|string|max:255','email'=>'sometimes|email|unique:owners,email,'.$u->id,'password'=>'nullable|string|min:8','role'=>'sometimes|in:kitchen,cashier,waiter','active'=>'sometimes|boolean']);if(empty($d['password']))unset($d['password']);$u->update($d);return $u->fresh();}
 public function destroy(Request $r,int $id){$this->owner($r);Owner::where('restaurant_id',$r->user()->restaurant_id)->where('role','!=','owner')->findOrFail($id)->delete();return response()->noContent();}
}
