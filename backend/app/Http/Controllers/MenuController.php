<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;use Illuminate\Support\Facades\DB;
class MenuController extends Controller{
 private function out($d,$s=200){return response()->json(['data'=>$d],$s);} private function q($r){return DB::table('menu_items')->where('user_id',$r->user()->id);}
 public function index(Request $r){return $this->out($this->q($r)->latest()->get());}
 public function store(Request $r){$v=$r->validate(['name'=>'required|string|max:255','price'=>'required|numeric|min:0','category'=>'nullable|string','description'=>'nullable|string','imageUrl'=>'nullable|string|max:2048']);$id=DB::table('menu_items')->insertGetId(['user_id'=>$r->user()->id,'name'=>$v['name'],'price'=>$v['price'],'category'=>$v['category']??null,'description'=>$v['description']??null,'image_url'=>$v['imageUrl']??null,'is_available'=>true,'created_at'=>now(),'updated_at'=>now()]);return $this->out(DB::table('menu_items')->find($id),201);}
 public function update(Request $r,$id){$item=$this->q($r)->find($id);if(!$item)return response()->json(['message'=>'Menu item not found'],404);$v=$r->validate(['name'=>'sometimes|required|string|max:255','price'=>'sometimes|required|numeric|min:0','category'=>'nullable|string','description'=>'nullable|string','imageUrl'=>'nullable|string|max:2048','is_available'=>'sometimes|boolean']);$data=[];foreach(['name','price','category','description','is_available'] as $k)if(array_key_exists($k,$v))$data[$k]=$v[$k];if(array_key_exists('imageUrl',$v))$data['image_url']=$v['imageUrl'];$data['updated_at']=now();$this->q($r)->where('id',$id)->update($data);return $this->out(DB::table('menu_items')->find($id));}
 public function destroy(Request $r,$id){$n=$this->q($r)->where('id',$id)->delete();return $n?$this->out(['message'=>'Deleted']):response()->json(['message'=>'Menu item not found'],404);}
 public function publicMenu($code){$t=DB::table('restaurant_tables')->where('table_code',$code)->first();if(!$t)return response()->json(['message'=>'Invalid table code'],404);return $this->out(['table'=>$t,'items'=>DB::table('menu_items')->where('user_id',$t->user_id)->where('is_available',true)->orderBy('category')->orderBy('name')->get()]);}
}
