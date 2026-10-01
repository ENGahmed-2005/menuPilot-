<?php

namespace App\Http\Middleware;

use App\Support\RestaurantFeatures;
use App\Support\SubscriptionAccess;
use Closure;
use Illuminate\Http\Request;

/**
 * Blocks a route when the restaurant's plan (or the platform admin) doesn't
 * give it the feature (App\Support\RestaurantFeatures). Uses entitlements,
 * not the subscription state, so a trial or the grace days are unaffected
 * (the `subscription` middleware handles restricted mode).
 *
 *   feature:kitchen         restaurant of the authenticated user
 *   feature:dine_in,table   customer route with {code} (table code)
 */
class EnsureRestaurantFeature
{
    public function handle(Request $request, Closure $next, string $feature, string $source = 'user')
    {
        $access = SubscriptionAccess::fromRoute($request, $source);
        if (! $access || $access->entitles($feature)) {
            return $next($request);
        }

        $label = RestaurantFeatures::label($feature);

        return response()->json([
            'message' => $source === 'user'
                ? "ميزة «{$label}» غير متاحة لمطعمك. يمكنك تغيير خطتك، أو التواصل مع فريق menuPilot."
                : 'هذا المطعم لا يستقبل طلبات الطاولات عبر التطبيق. اطلب من رابط المطعم أو من أحد أفراد الطاقم.',
            'code' => 'FEATURE_NOT_AVAILABLE',
            'feature' => $feature,
        ], 403);
    }
}
