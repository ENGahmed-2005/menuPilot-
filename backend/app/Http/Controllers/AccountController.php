<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;
class AccountController extends Controller{
 public function plan(Request $r){$v=$r->validate(['plan'=>'required|in:starter,pro,enterprise']);$r->user()->update(['plan'=>$v['plan']]);return response()->json(['data'=>$r->user()]);}
 public function theme(Request $r){$v=$r->validate(['theme'=>'required|array']);$r->user()->update(['theme'=>$v['theme']]);return response()->json(['data'=>$r->user()]);}
}
