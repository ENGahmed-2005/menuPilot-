<?php
namespace App\Http\Controllers;
use App\Models\Owner; use App\Models\Restaurant; use Illuminate\Http\Request;
class AdminController extends Controller { private function admin(Request $r):void{abort_unless($r->user()->role==='admin',403,'غير مسموح.');} public function restaurants(Request $r){$this->admin($r);return Restaurant::withCount('owners')->latest()->get();} public function plan(Request $r,int $id){$this->admin($r);$d=$r->validate(['plan'=>'required|string|max:50']);$restaurant=Restaurant::findOrFail($id);$restaurant->update(['plan'=>$d['plan']]);Owner::where('restaurant_id',$id)->where('role','owner')->update(['plan'=>$d['plan']]);return $restaurant->fresh();} }
