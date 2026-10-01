<?php

namespace App\Http\Middleware;

use App\Support\SubscriptionAccess;
use Closure;
use Illuminate\Http\Request;

/**
 * Blocks table routes for plans without dine-in (delivery_only): managing
 * tables and QR codes, and opening a table session. Depends on the plan, not
 * on the subscription state, so a trial or a grace period is unaffected (the
 * `subscription` middleware handles restricted mode).
 *
 *   dine_in          restaurant of the authenticated user
 *   dine_in:table    customer route with {code} (table code)
 */
class EnsureDineIn
{
    public function handle(Request $request, Closure $next, string $source = 'user')
    {
        $access = SubscriptionAccess::fromRoute($request, $source);
        if (! $access || $access->allowsDineIn()) {
            return $next($request);
        }

        return response()->json([
            'message' => $source === 'user'
                ? 'اشتراك «التوصيل فقط» لا يشمل الطاولات والطلب من الطاولة. انتقل إلى الخطة الأساسية أو الاحترافية لتفعيلها.'
                : 'هذا المطعم يستقبل الطلبات أونلاين فقط. اطلب من رابط المطعم أو من أحد أفراد الطاقم.',
            'code' => 'DINE_IN_NOT_IN_PLAN',
        ], 403);
    }
}
