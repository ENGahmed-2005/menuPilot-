<?php

namespace App\Http\Middleware;

use App\Models\Staff;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;

class ApiAuth
{
    public function handle(Request $request, Closure $next)
    {
        $header = $request->header('Authorization', '');

        if (! preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $token = hash('sha256', trim($matches[1]));
        $user = User::where('api_token', $token)->first();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
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

        $request->setUserResolver(static fn () => $user);

        return $next($request);
    }
}
