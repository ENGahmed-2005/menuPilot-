<?php

namespace App\Http\Controllers;

use App\Support\SubscriptionAccess;
use App\Support\SubscriptionPlans;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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
            'payment_methods.cash' => 'nullable|array',
            'payment_methods.cash.enabled' => 'nullable|boolean',
            'payment_methods.cash.note' => 'nullable|string|max:255',
            // Dine-in: pay before the kitchen prepares, or after eating.
            'payment_timing' => 'nullable|in:before,after',
        ]);

        // Guests must always have at least one way to pay.
        if (isset($validated['payment_methods'])) {
            $pm = $validated['payment_methods'];
            $anyOn = ($pm['cash']['enabled'] ?? true) || ($pm['bank']['enabled'] ?? false) || ($pm['wallet']['enabled'] ?? false);
            if (! $anyOn) {
                return response()->json(['message' => 'فعّل طريقة دفع واحدة على الأقل ليستطيع الزبائن الدفع.', 'errors' => ['payment_methods' => ['none_enabled']]], 422);
            }
        }
        $user->update([...$validated, 'name' => $validated['restaurant_name']]);

        return response()->json(['data' => $user->fresh()]);
    }

    public function plan(Request $request)
    {
        $v = $request->validate([
            'plan' => ['required', Rule::in(SubscriptionPlans::acceptedPlans())],
            'addons' => ['sometimes', 'array', 'max:10'],
            'addons.*' => ['string', 'distinct', Rule::in(array_keys(SubscriptionPlans::addons()))],
        ]);
        [$plan, $addons] = SubscriptionPlans::normalize($v['plan'], $v['addons'] ?? []);
        if ($conflict = SubscriptionPlans::incompatibility($plan, $addons)) {
            return response()->json(['message' => $conflict, 'errors' => ['addons' => [$conflict]], 'code' => 'ADDON_NOT_AVAILABLE'], 422);
        }
        $user = $request->user();

        // The owner can't switch plans by themselves (that used to activate a
        // paid plan without payment). The choice is recorded; the platform
        // activates it once the payment is confirmed (admin → plan).
        $user->forceFill(['requested_plan' => $plan, 'requested_addons' => $addons, 'plan_requested_at' => now()])->save();
        SubscriptionAccess::event('subscription_requested', $user->id, ['plan' => $plan, 'addons' => $addons]);

        $fresh = $user->fresh();
        $fresh->setAttribute('subscription', SubscriptionAccess::for($fresh)->toArray());

        return response()->json(['data' => $fresh, 'meta' => [
            'status' => 'pending_payment',
            'message' => 'سجّلنا اختيارك للخطة. تُفعَّل فور تأكيد الدفع من فريق menuPilot، وبياناتك محفوظة حتى ذلك الحين.',
        ]], 202);
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

        if (! $user->hasFeature($requiredFeature)) {
            return response()->json([
                'message' => $preset === 'custom'
                    ? 'الألوان المخصصة تحتاج إضافة «الهوية الكاملة» مع الخطة الاحترافية، أو تجربة مجانية سارية.'
                    : 'الثيمات الجاهزة تحتاج الخطة الاحترافية، أو تجربة مجانية سارية.',
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
