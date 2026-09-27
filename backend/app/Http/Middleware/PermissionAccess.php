<?php

namespace App\Http\Middleware;

use App\Support\Permissions;
use Closure;
use Illuminate\Http\Request;

/**
 * Route-level authorization: `permission:close_session` or, for "any of",
 * `permission:view_tables|view_orders`. Tenant scoping stays in the
 * controllers (every query is filtered by the authenticated user's
 * restaurant), so a permission never grants access to another restaurant.
 */
class PermissionAccess
{
    public function handle(Request $request, Closure $next, string $permissions)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $required = explode('|', $permissions);
        if (! Permissions::allows($user, $required)) {
            return response()->json([
                'message' => 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
                'code' => 'PERMISSION_DENIED',
                'required' => $required,
            ], 403);
        }

        return $next($request);
    }
}
