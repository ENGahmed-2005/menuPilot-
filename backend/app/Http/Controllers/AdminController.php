<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    private function guard(Request $r)
    {
        return $r->user()->role === 'admin';
    }

    public function restaurants(Request $r)
    {
        if (! $this->guard($r)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        User::where('role', 'owner')->get()->each->refreshSubscriptionStatus();

        return response()->json(['data' => User::where('role', 'owner')->with('restaurantSetting')->get([
            'id', 'name', 'restaurant_name', 'restaurant_phone', 'email', 'plan',
            'trial_started_at', 'trial_ends_at', 'subscription_started_at', 'subscription_ends_at', 'created_at',
        ])]);
    }

    public function plan(Request $r, $id)
    {
        if (! $this->guard($r)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $v = $r->validate(['plan' => 'required|in:basic,pro,premium']);
        $u = User::where('role', 'owner')->findOrFail($id);
        $u->update([
            'plan' => $v['plan'],
            'subscription_started_at' => now(),
            'subscription_ends_at' => null,
        ]);

        return response()->json(['data' => $u->fresh()]);
    }

    public function extendTrial(Request $r, $id)
    {
        if (! $this->guard($r)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $v = $r->validate(['days' => 'required|integer|min:1|max:365']);
        $u = User::where('role', 'owner')->findOrFail($id);
        $base = $u->trial_ends_at && $u->trial_ends_at->isFuture() ? $u->trial_ends_at : now();
        $u->update([
            'plan' => 'trial',
            'trial_started_at' => $u->trial_started_at ?: now(),
            'trial_ends_at' => $base->copy()->addDays($v['days']),
        ]);

        return response()->json(['data' => $u->fresh()]);
    }

    public function updateOwner(Request $r, $id)
    {
        if (! $this->guard($r)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $u = User::where('role', 'owner')->findOrFail($id);
        $v = $r->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $u->id,
            'restaurant_name' => 'nullable|string|max:255',
            'restaurant_phone' => 'nullable|string|max:50',
        ]);

        $u->update($v);

        return response()->json(['data' => $u->fresh()]);
    }
}
