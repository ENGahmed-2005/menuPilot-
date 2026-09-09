<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;use Illuminate\Support\Facades\DB;
class StaffController extends Controller{
 private function out($d,$s=200){return response()->json(['data'=>$d],$s);}private function q($r){return DB::table('staff')->where('user_id',$r->user()->id);}
 public function index(Request $r){return $this->out($this->q($r)->get());}
 public function store(Request $r){$v=$r->validate(['name'=>'required|string|max:255','email'=>'nullable|email','role'=>'required|in:waiter,cashier,kitchen,manager']);$id=DB::table('staff')->insertGetId(['user_id'=>$r->user()->id,'name'=>$v['name'],'email'=>$v['email']??null,'role'=>$v['role'],'created_at'=>now(),'updated_at'=>now()]);return $this->out(DB::table('staff')->find($id),201);}
 public function update(Request $r,$id){$v=$r->validate(['name'=>'sometimes|required|string|max:255','email'=>'nullable|email','role'=>'sometimes|required|in:waiter,cashier,kitchen,manager']);$n=$this->q($r)->where('id',$id)->update(array_merge($v,['updated_at'=>now()]));return $n?$this->out(DB::table('staff')->find($id)):response()->json(['message'=>'Staff not found'],404);}
 public function destroy(Request $r,$id){$n=$this->q($r)->where('id',$id)->delete();return $n?$this->out(['message'=>'Deleted']):response()->json(['message'=>'Staff not found'],404);}
}
