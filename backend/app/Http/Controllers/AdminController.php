<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    private function guard(Request $r){ return $r->user()->role === 'admin'; }

    public function restaurants(Request $r)
    {
        if(!$this->guard($r)) return response()->json(['message'=>'Forbidden'],403);
        User::where('role','owner')->get()->each->refreshSubscriptionStatus();
        return response()->json(['data'=>User::where('role','owner')->with('restaurantSetting')->get([
            'id','restaurant_name','email','plan','trial_started_at','trial_ends_at','subscription_started_at','subscription_ends_at','created_at'
        ])]);
    }

    public function plan(Request $r,$id)
    {
        if(!$this->guard($r)) return response()->json(['message'=>'Forbidden'],403);
        $v=$r->validate(['plan'=>'required|in:basic,pro,premium']);
        $u=User::findOrFail($id);
        $u->update(['plan'=>$v['plan'],'subscription_started_at'=>now()]);
        return response()->json(['data'=>$u->fresh()]);
    }

    public function extendTrial(Request $r,$id)
    {
        if(!$this->guard($r)) return response()->json(['message'=>'Forbidden'],403);
        $v=$r->validate(['days'=>'required|integer|min:1|max:365']);
        $u=User::findOrFail($id);
        $base = $u->trial_ends_at && $u->trial_ends_at->isFuture() ? $u->trial_ends_at : now();
        $u->update(['plan'=>'trial','trial_started_at'=>$u->trial_started_at ?: now(),'trial_ends_at'=>$base->copy()->addDays($v['days'])]);
        return response()->json(['data'=>$u->fresh()]);
    }
}
