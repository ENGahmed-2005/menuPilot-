<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;use Illuminate\Support\Facades\DB;use Illuminate\Support\Str;
class TableController extends Controller{
 private function out($d,$s=200){return response()->json(['data'=>$d],$s);}private function q($r){return DB::table('restaurant_tables')->where('user_id',$r->user()->id);}
 public function index(Request $r){return $this->out($this->q($r)->orderBy('id')->get());}
 public function store(Request $r){$v=$r->validate(['label'=>'required|string|max:100','seats'=>'required|integer|min:1|max:100']);do{$c=Str::upper(Str::random(10));}while(DB::table('restaurant_tables')->where('table_code',$c)->exists());$id=DB::table('restaurant_tables')->insertGetId(['user_id'=>$r->user()->id,'label'=>$v['label'],'seats'=>$v['seats'],'table_code'=>$c,'status'=>'available','created_at'=>now(),'updated_at'=>now()]);return $this->out(DB::table('restaurant_tables')->find($id),201);}
 public function update(Request $r,$id){$v=$r->validate(['label'=>'sometimes|required|string|max:100','seats'=>'sometimes|required|integer|min:1']);$n=$this->q($r)->where('id',$id)->update(array_merge($v,['updated_at'=>now()]));return $n?$this->out(DB::table('restaurant_tables')->find($id)):response()->json(['message'=>'Table not found'],404);}
 public function destroy(Request $r,$id){$n=$this->q($r)->where('id',$id)->delete();return $n?$this->out(['message'=>'Deleted']):response()->json(['message'=>'Table not found'],404);}
 public function status(Request $r,$id){$t=$this->q($r)->find($id);return $t?$this->out(['status'=>$t->status]):response()->json(['message'=>'Table not found'],404);}
}
