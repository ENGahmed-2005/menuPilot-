<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function show(Request $request)
    {
        return response()->json(['data' => $request->user()]);
    }

    public function updateRestaurant(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'restaurant_name' => 'required|string|max:255',
            'restaurant_phone' => 'nullable|string|max:50',
            'restaurant_description' => 'nullable|string|max:2000',
            'restaurant_address' => 'nullable|string|max:500',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
        ]);

        $user->update([
            ...$validated,
            'name' => $validated['restaurant_name'],
        ]);

        return response()->json(['data' => $user->fresh()]);
    }

    public function plan(Request $request)
    {
        $v = $request->validate(['plan' => 'required|in:starter,pro,enterprise']);
        $request->user()->update(['plan' => $v['plan']]);
        return response()->json(['data' => $request->user()->fresh()]);
    }

    public function theme(Request $request)
    {
        $v = $request->validate(['theme' => 'required|array']);
        $request->user()->update(['theme' => $v['theme']]);
        return response()->json(['data' => $request->user()->fresh()]);
    }
}
