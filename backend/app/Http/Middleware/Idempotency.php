<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

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

    public function handle(Request $request, Closure $next)
    {
        $key = (string) $request->header('Idempotency-Key');
        if ($request->isMethodSafe() || $key === '' || ! preg_match('/^[A-Za-z0-9_-]{8,100}$/', $key)) {
            return $next($request);
        }

        // Same key from another person or for another address is another request.
        $scope = hash('sha256', ($request->bearerToken() ?: $request->ip()).'|'.$request->method().'|'.$request->path().'|'.$key);
        $storeKey = "idempotency:$scope";

        if ($saved = Cache::get($storeKey)) {
            return $this->replay($saved);
        }

        // The first try is still running (the retry came too early): ask to wait.
        $lock = Cache::lock("$storeKey:lock", 30);
        if (! $lock->get()) {
            return response()->json(['message' => 'The same request is still being processed.', 'code' => 'IDEMPOTENCY_IN_PROGRESS'], 409, ['Retry-After' => '2']);
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

    private function replay(array $saved)
    {
        return response($saved['content'], $saved['status'], ['Content-Type' => $saved['type'], 'Idempotent-Replay' => 'true']);
    }
}
