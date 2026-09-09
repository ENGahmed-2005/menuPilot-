<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function changePlan(Request $request)
    {
        $data = $request->validate(['plan'=>'required|string|max:50']);
        $owner = $request->user();
        $owner->update(['plan'=>$data['plan']]);
        return response()->json(['message'=>'تم تحديث الباقة','plan'=>$owner->plan]);
    }
}
