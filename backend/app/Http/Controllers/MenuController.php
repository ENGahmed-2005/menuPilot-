<?php
namespace App\Http\Controllers;
use App\Models\Product; use App\Models\Table; use Illuminate\Http\Request;
class MenuController extends Controller { public function index(Request $r){return response()->json(['data'=>Product::with('category')->where('restaurant_id',$r->user()->restaurant_id)->orderBy('category_id')->orderBy('name')->get()]);} public function publicMenu(string $code){$t=Table::where('code',$code)->where('is_active',true)->firstOrFail();$items=Product::with('category')->where('restaurant_id',$t->restaurant_id)->where('is_available',true)->orderBy('category_id')->orderBy('name')->get();return response()->json(['data'=>['table'=>$t,'items'=>$items]]);}}
