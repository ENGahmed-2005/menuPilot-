<?php
namespace App\Http\Controllers;
use App\Models\User;use Illuminate\Http\Request;
class AdminController extends Controller{
 private function guard(Request $r){return $r->user()->role==='admin';}
 public function restaurants(Request $r){if(!$this->guard($r))return response()->json(['message'=>'Forbidden'],403);return response()->json(['data'=>User::where('role','owner')->get(['id','restaurant_name','email','plan','created_at'])]);}
 public function plan(Request $r,$id){if(!$this->guard($r))return response()->json(['message'=>'Forbidden'],403);$v=$r->validate(['plan'=>'required|in:starter,pro,enterprise']);$u=User::findOrFail($id);$u->update(['plan'=>$v['plan']]);return response()->json(['data'=>$u]);}
}
