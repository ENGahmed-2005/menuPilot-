<?php

namespace App\Http\Middleware;

use App\Support\Realtime;
use App\Support\SubscriptionAccess;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * After a successful change through the API, tell the screens that care
 * (App\Support\Realtime). Runs once the response has been sent, and a
 * failure here never affects the request. One table for every route, so a
 * new endpoint under a known prefix is covered without extra code.
 */
class BroadcastChanges
{
    public function handle(Request $request, Closure $next)
    {
        return $next($request);
    }

    public function terminate(Request $request, $response): void
    {
        $status = $response->getStatusCode();
        if (! Realtime::enabled() || $request->isMethodSafe() || $status < 200 || $status >= 300) {
            return;
        }
        try {
            $this->signal($request);
        } catch (\Throwable $e) {
            Log::warning('Realtime: could not work out the signals: '.$e->getMessage());
        }
    }

    private function signal(Request $r): void
    {
        $uri = Str::after((string) $r->route()?->uri(), 'api/');
        $param = fn (string $key) => $r->route($key);
        $owner = null;
        $topics = [];
        $sessions = [];
        $outside = [];

        if (Str::startsWith($uri, 'public/sessions/')) {
            $sid = (int) $param('id');
            $sessions[] = $sid;
            $owner = DB::table('dining_sessions')->join('restaurant_tables', 'restaurant_tables.id', '=', 'dining_sessions.restaurant_table_id')
                ->where('dining_sessions.id', $sid)->value('restaurant_tables.user_id');
            $topics = Str::endsWith($uri, '/orders') ? ['orders', 'tables'] : ['tables'];
        } elseif ($uri === 'public/tables/{code}/sessions') {
            $owner = DB::table('restaurant_tables')->where('table_code', $param('code'))->value('user_id');
            $topics = ['tables'];
        } elseif ($uri === 'public/restaurants/{slug}/orders') {
            $owner = DB::table('online_ordering_settings')->where('slug', $param('slug'))->value('user_id');
            $topics = ['outside'];
        } else {
            $user = $r->user();
            if (! $user) {
                return;
            }
            $owner = SubscriptionAccess::for($user)->owner()?->id ?? $user->id;
            $order = null;
            switch (Str::before($uri, '/')) {
                case 'kitchen':
                case 'orders':
                    $order = DB::table('orders')->where('id', $param('id'))->first(['id', 'dining_session_id', 'channel']);
                    $topics = ['orders', 'tables'];
                    break;
                case 'order-items':
                    $order = DB::table('orders')->whereIn('id', DB::table('order_items')->where('id', $param('id'))->select('order_id'))->first(['id', 'dining_session_id', 'channel']);
                    $topics = ['orders', 'tables'];
                    break;
                case 'sessions':
                    $sessions[] = (int) ($param('id') ?? $param('sessionId'));
                    $topics = ['tables', 'orders'];
                    break;
                case 'payments':
                    $sessions[] = (int) DB::table('payments')->where('id', $param('id'))->value('dining_session_id');
                    $topics = ['tables'];
                    break;
                case 'assistance-requests':
                    $sessions[] = (int) DB::table('assistance_requests')->where('id', $param('id'))->value('dining_session_id');
                    $topics = ['tables'];
                    break;
                case 'outside-orders':
                    $outside[] = (int) $param('id');
                    $topics = ['outside', 'orders'];
                    break;
                case 'tables':
                    $topics = ['tables'];
                    break;
                default:
                    return;
            }
            if ($order) {
                if ($order->dining_session_id) {
                    $sessions[] = (int) $order->dining_session_id;
                }
                if (in_array($order->channel ?? null, ['pickup', 'delivery'], true)) {
                    $outside[] = (int) $order->id;
                    $topics[] = 'outside';
                }
            }
        }

        if ($owner) {
            foreach (array_unique($topics) as $topic) {
                Realtime::restaurant((int) $owner, $topic);
            }
        }
        foreach (array_unique(array_filter($sessions)) as $sid) {
            Realtime::session($sid);
        }
        foreach (array_unique(array_filter($outside)) as $oid) {
            Realtime::outside($oid);
        }
    }
}
