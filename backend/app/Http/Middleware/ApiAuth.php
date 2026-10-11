<?php

namespace App\Http\Middleware;

use App\Models\Staff;
use App\Models\User;
use App\Support\AuthSessions;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Signed-in API access. The user comes from a Better Auth session (cookie or
 * Bearer session token) or, for the shared demo accounts only, the legacy
 * api_token — App\Support\AuthSessions. Account status is re-checked on every
 * request, so disabling bites immediately, not at the next sign-in.
 */
class ApiAuth
{
    public function handle(Request $request, Closure $next)
    {
        $auth = AuthSessions::resolve($request);

        if ($auth['status'] === AuthSessions::MISSING) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        if ($auth['status'] !== AuthSessions::OK) {
            return response()->json(['message' => 'انتهت جلسة الدخول. سجّل الدخول مجددًا.', 'code' => 'SESSION_EXPIRED'], 401);
        }
        $user = $auth['user'];

        // The cookie is SameSite=Lax already; refuse a cross-site change on top
        // (browsers send Sec-Fetch-Site; the app itself is always same-origin).
        if ($auth['via'] === 'cookie' && ! $request->isMethodSafe() && $request->headers->get('Sec-Fetch-Site') === 'cross-site') {
            return response()->json(['message' => 'طلب غير مسموح من موقع آخر.', 'code' => 'CROSS_SITE_REQUEST'], 403);
        }

        // Disabled accounts lose API access immediately, not at next login:
        // a disabled owner/admin, an inactive staff member, or staff whose
        // restaurant owner has been disabled by the platform admin.
        if (isset($user->is_active) && ! $user->is_active) {
            return response()->json(['message' => 'تم تعطيل هذا الحساب. تواصل مع إدارة المطعم.', 'code' => 'ACCOUNT_DISABLED'], 403);
        }
        if (! in_array($user->role, ['owner', 'admin'], true)) {
            $staff = Staff::where('account_user_id', $user->id)->first();
            $ownerActive = $staff ? User::where('id', $staff->user_id)->value('is_active') : null;
            if (! $staff || ! $staff->active || $staff->role !== $user->role || $ownerActive === false || $ownerActive === 0) {
                return response()->json(['message' => 'تم تعطيل هذا الحساب. تواصل مع إدارة المطعم.', 'code' => 'ACCOUNT_DISABLED'], 403);
            }
        }

        // "Last activity" for staff management, written at most every 5 minutes.
        if (! $user->last_active_at || $user->last_active_at->lt(now()->subMinutes(5))) {
            User::where('id', $user->id)->update(['last_active_at' => now()]);
        }
        // …and for this device on the Security page.
        if ($auth['session']) {
            AuthSessions::touch($auth['session']);
        }

        $request->setUserResolver(static fn () => $user);

        // The demo restaurant can be used freely, but not its accounts, plan,
        // payments or restaurant details (App\Support\DemoRestaurant).
        if ($user->is_demo && ! $request->isMethodSafe() && self::closedInDemo((string) $request->route()?->uri())) {
            return response()->json(['message' => 'هذا الإجراء غير متاح في المطعم التجريبي. أنشئ حسابك لتجربته كاملًا.', 'code' => 'DEMO_READ_ONLY'], 403);
        }

        return $next($request);
    }

    private static function closedInDemo(string $uri): bool
    {
        $uri = Str::after($uri, 'api/');
        foreach (['staff', 'me/plan', 'me/restaurant', 'subscription/', 'online-ordering/settings', 'accounting/settings'] as $prefix) {
            if (str_starts_with($uri, $prefix)) {
                return true;
            }
        }

        return false;
    }
}
