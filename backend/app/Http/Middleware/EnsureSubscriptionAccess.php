<?php

namespace App\Http\Middleware;

use App\Support\SubscriptionAccess;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Blocks OPERATIONAL routes when the restaurant is in restricted mode
 * (trial ended and grace over, or subscription cancelled). Applied only to
 * operational routes — billing, reports, exports, settings and reading data
 * stay open. Runs together with the permission middleware: a request must
 * pass both.
 *
 *   subscription           restaurant of the authenticated user
 *   subscription:table     customer route with {code} (table code)
 *   subscription:session   customer route with {id} (dining session)
 */
class EnsureSubscriptionAccess
{
    public function handle(Request $request, Closure $next, string $source = 'user')
    {
        $access = match ($source) {
            'table' => ($rid = DB::table('restaurant_tables')->where('table_code', $request->route('code'))->value('user_id')) ? SubscriptionAccess::forRestaurant((int) $rid) : null,
            'session' => ($rid = DB::table('dining_sessions')->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')->where('dining_sessions.id', $request->route('id'))->value('restaurant_tables.user_id')) ? SubscriptionAccess::forRestaurant((int) $rid) : null,
            default => SubscriptionAccess::for($request->user()),
        };

        // Unknown table/session: let the controller answer 404 as usual.
        if (! $access || $access->sync()->canOperate()) {
            return $next($request);
        }

        $customer = $source !== 'user';

        return response()->json([
            'message' => $customer
                ? 'المطعم لا يستقبل طلبات جديدة عبر التطبيق حاليًا. اطلب المساعدة من أحد أفراد الطاقم.'
                : 'انتهت الفترة التجريبية أو الاشتراك. بياناتك محفوظة، ويمكنك اختيار خطة لإعادة تفعيل هذه الميزة.',
            'code' => 'SUBSCRIPTION_RESTRICTED',
            'subscription' => $customer ? null : $access->toArray(),
        ], 403);
    }
}
