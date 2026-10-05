<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Safe retries for the offline queue (docs/offline.md). A screen that was
 * offline sends each change with an `Idempotency-Key`; if the answer was lost
 * and the same key arrives again, the first answer is replayed instead of
 * doing it twice (a payment, a close, a cancel). Only successful (2xx) answers
 * are kept, so a retry after a failure (e.g. an expired login) really runs.
 */
class Idempotency
{
    private const TTL_HOURS = 24;

    /** Seconds the first try may run before a retry with the same key may run it again. */
    private const LOCK_SECONDS = 30;

    private const KEY_PATTERN = '/^[A-Za-z0-9_-]{8,100}$/';

    public function handle(Request $request, Closure $next)
    {
        $key = (string) $request->header('Idempotency-Key');
        if ($request->isMethodSafe() || $key === '' || ! preg_match(self::KEY_PATTERN, $key)) {
            return $next($request);
        }

        // Same key from another person or for another address is another request.
        $scope = hash('sha256', $this->who($request).'|'.$request->method().'|'.$request->path().'|'.$key);
        $storeKey = "idempotency:$scope";

        if ($saved = Cache::get($storeKey)) {
            return $this->replay($saved);
        }

        // The first try is still running (the retry came too early): ask to wait.
        $lock = Cache::lock("$storeKey:lock", self::LOCK_SECONDS);
        if (! $lock->get()) {
            return response()->json(['message' => 'الطلب نفسه ما زال قيد التنفيذ. حاول بعد لحظات.', 'code' => 'IDEMPOTENCY_IN_PROGRESS'], 409, ['Retry-After' => '2']);
        }

        try {
            // It may have finished between the first look and taking the lock.
            if ($saved = Cache::get($storeKey)) {
                return $this->replay($saved);
            }
            $response = $next($request);
            $status = $response->getStatusCode();
            if ($status >= 200 && $status < 300) {
                Cache::put($storeKey, [
                    'status' => $status,
                    'content' => $response->getContent(),
                    'type' => $response->headers->get('Content-Type', 'application/json'),
                ], now()->addHours(self::TTL_HOURS));
            }

            return $response;
        } finally {
            $lock->release();
        }
    }

    /**
     * Who sends it: the signed-in account (so a resend after signing in
     * again still replays), else the guest's session secret, else the IP.
     * Runs before ApiAuth, so it looks the token up the same way.
     */
    private function who(Request $request): string
    {
        if ($token = $request->bearerToken()) {
            $userId = DB::table('users')->where('api_token', hash('sha256', trim($token)))->value('id');
            if ($userId) {
                return "user:$userId";
            }
        }

        return ($session = $request->header('X-Session-Token')) ? 'session:'.hash('sha256', $session) : 'ip:'.$request->ip();
    }

    private function replay(array $saved)
    {
        return response($saved['content'], $saved['status'], ['Content-Type' => $saved['type'], 'Idempotent-Replay' => 'true']);
    }
}
