<?php

namespace App\Http\Middleware;

use App\Models\Staff;
use Closure;
use Illuminate\Http\Request;

class RoleAccess
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->role === 'admin' || $user->role === 'owner') {
            return $next($request);
        }

        if (! in_array($user->role, $roles, true)) {
            return response()->json(['message' => 'You do not have permission to perform this action.'], 403);
        }

        if (! Staff::where('account_user_id', $user->id)->where('active', true)->exists()) {
            return response()->json(['message' => 'Staff account is not active.'], 403);
        }

        return $next($request);
    }
}
