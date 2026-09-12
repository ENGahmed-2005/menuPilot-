<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function show(Request $request)
    {
        $u = $request->user();
        $u->refreshSubscriptionStatus();

        return response()->json(['data' => $u->load('restaurantSetting')]);
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
            'payment_methods' => 'nullable|array',
            'payment_methods.bank' => 'nullable|array',
            'payment_methods.bank.enabled' => 'nullable|boolean',
            'payment_methods.bank.name' => 'nullable|string|max:100',
            'payment_methods.bank.account_name' => 'nullable|string|max:255',
            'payment_methods.bank.account_number' => 'nullable|string|max:100',
            'payment_methods.bank.qr_url' => 'nullable|url|max:1000',
            'payment_methods.wallet' => 'nullable|array',
            'payment_methods.wallet.enabled' => 'nullable|boolean',
            'payment_methods.wallet.name' => 'nullable|string|max:100',
            'payment_methods.wallet.account_name' => 'nullable|string|max:255',
            'payment_methods.wallet.account_number' => 'nullable|string|max:100',
            'payment_methods.wallet.qr_url' => 'nullable|url|max:1000',
        ]);

        $user->update([...$validated, 'name' => $validated['restaurant_name']]);

        return response()->json(['data' => $user->fresh()]);
    }

    public function plan(Request $request)
    {
        $v = $request->validate(['plan' => 'required|in:basic,pro,premium']);
        $request->user()->update([
            'plan' => $v['plan'],
            'subscription_started_at' => now(),
        ]);

        return response()->json(['data' => $request->user()->fresh()]);
    }

    public function theme(Request $request)
    {
        $user = $request->user();
        $user->refreshSubscriptionStatus();

        $theme = $request->input('theme');

        // Reset is always allowed and restores the default dashboard theme.
        if ($theme === null) {
            $user->update(['theme' => null]);
            return response()->json(['data' => $user->fresh()]);
        }

        $validated = $request->validate([
            'theme' => 'required|array',
            'theme.preset' => 'required|string|in:menuPilot,forest,terracotta,plum,custom',
            'theme.colors' => 'nullable|array',
            'theme.colors.primary' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'theme.colors.secondary' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'theme.colors.background' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $preset = $validated['theme']['preset'];
        $requiredFeature = $preset === 'custom' ? 'custom-theme' : 'theme-presets';

        if (!$user->hasFeature($requiredFeature)) {
            return response()->json([
                'message' => $preset === 'custom'
                    ? 'Custom themes require Premium or an active Trial.'
                    : 'Theme presets require Pro, Premium, or an active Trial.',
            ], 403);
        }

        if ($preset === 'custom') {
            $colors = $validated['theme']['colors'] ?? [];
            foreach (['primary', 'secondary', 'background'] as $key) {
                if (empty($colors[$key])) {
                    return response()->json(['message' => "Theme color {$key} is required."], 422);
                }
            }
        }

        $user->update(['theme' => $validated['theme']]);

        return response()->json(['data' => $user->fresh()]);
    }
}
