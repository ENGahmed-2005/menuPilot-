<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Public dining-session endpoints require the session's secret, sent as
 * X-Session-Token (or ?token= for EventSource, which can't set headers).
 * The customer's phone receives it when the session opens; a second diner
 * who scans the same table's QR (inside the geofence) receives it too.
 * Sessions opened before this change (no token) keep working until closed.
 */
class EnsureSessionToken
{
    public function handle(Request $request, Closure $next)
    {
        $id = $request->route('id');
        $session = DB::table('dining_sessions')->where('id', $id)->select('id', 'access_token')->first();

        // Unknown session: let the controller answer 404 as before.
        if (! $session || $session->access_token === null) {
            return $next($request);
        }

        $given = (string) ($request->header('X-Session-Token') ?: $request->query('token', ''));
        if ($given === '' || ! hash_equals($session->access_token, $given)) {
            return response()->json([
                'message' => 'انتهت صلاحية رابط الطاولة. امسح رمز QR على الطاولة مرة أخرى.',
                'code' => 'SESSION_TOKEN_INVALID',
            ], 403);
        }

        return $next($request);
    }
}
