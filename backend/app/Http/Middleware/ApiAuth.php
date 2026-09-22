<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ApiAuth
{
    public function handle(Request $request, Closure $next)
    {
        $plain = trim((string) $request->bearerToken());
        if ($plain === '') return response()->json(['message' => 'Unauthenticated.'], 401);

        $hash = hash('sha256', $plain);
        $user = null;

        if (DB::getSchemaBuilder()->hasTable('api_tokens')) {
            $token = DB::table('api_tokens')->where('token_hash', $hash)->first();
            if ($token && (! $token->expires_at || now()->lt($token->expires_at))) {
                $user = User::find($token->user_id);
                if ($user) DB::table('api_tokens')->where('id', $token->id)->update(['last_used_at' => now(), 'updated_at' => now()]);
            }
        }

        if (! $user) $user = User::where('api_token', $hash)->first();
        if (! $user) return response()->json(['message' => 'Unauthenticated.'], 401);

        $request->setUserResolver(static fn () => $user);
        return $next($request);
    }
}