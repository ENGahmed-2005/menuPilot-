<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\LogtoUserInfoService;
use Closure;
use Illuminate\Http\Request;
use Throwable;

class ApiAuth
{
    public function handle(Request $request, Closure $next)
    {
        $token = trim((string) $request->bearerToken());
        if ($token === '') return response()->json(['message' => 'Unauthenticated.'], 401);

        try {
            $claims = app(LogtoUserInfoService::class)->getUser($token);
            $subject = (string) ($claims['sub'] ?? '');
            if ($subject === '') throw new \RuntimeException('Missing Logto subject.');

            $user = User::where('logto_subject', $subject)->first();
            if (!$user) return response()->json(['message' => 'Logto account is not linked to a menuPilot account.'], 403);

            if (method_exists($user, 'refreshSubscriptionStatus')) $user->refreshSubscriptionStatus();
            $request->setUserResolver(static fn () => $user);
            $request->attributes->set('logto_claims', $claims);

            return $next($request);
        } catch (Throwable $e) {
            return response()->json(['message' => 'Unauthenticated.', 'code' => 'LOGTO_TOKEN_INVALID'], 401);
        }
    }
}
