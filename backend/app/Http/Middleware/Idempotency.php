<?php

namespace App\Http\Middleware;

use App\Support\AuthSessions;
use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Durable retry protection for state-changing API requests.
 *
 * The idempotency record and the controller's database changes are committed
 * in the same outer transaction. If the process dies before commit, both roll
 * back; if the commit succeeds but the response is lost, a retry replays the
 * stored response. The unique key also serializes concurrent requests across
 * app instances without depending on a shared cache/lock driver.
 */
class Idempotency
{
    private const TTL_HOURS = 24;

    private const KEY_PATTERN = '/^[A-Za-z0-9_-]{8,100}$/';

    public function handle(Request $request, Closure $next)
    {
        $key = (string) $request->header('Idempotency-Key');
        if ($request->isMethodSafe() || $key === '' || ! preg_match(self::KEY_PATTERN, $key)) {
            return $next($request);
        }

        $keyHash = hash('sha256', $this->who($request).'|'.$request->method().'|'.$request->path().'|'.$key);
        $requestHash = hash('sha256', $request->getContent().'|'.http_build_query($request->query()));
        $now = now();

        $saved = DB::table('idempotency_records')
            ->where('key_hash', $keyHash)
            ->where('expires_at', '>', $now)
            ->first();

        if ($saved) {
            return $this->replayOrConflict($saved, $requestHash);
        }

        try {
            return DB::transaction(function () use ($request, $next, $keyHash, $requestHash) {
                // Remove only an expired entry. A concurrent insert for the same
                // key is arbitrated by the unique index, not by a cache lock.
                DB::table('idempotency_records')
                    ->where('key_hash', $keyHash)
                    ->where('expires_at', '<=', now())
                    ->delete();

                DB::table('idempotency_records')->insert([
                    'key_hash' => $keyHash,
                    'request_hash' => $requestHash,
                    'response_status' => null,
                    'response_content' => null,
                    'response_type' => null,
                    'expires_at' => now()->addHours(self::TTL_HOURS),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Nested controller transactions become savepoints under this
                // transaction, keeping the mutation and replay record atomic.
                $response = $next($request);
                $status = $response->getStatusCode();

                if ($status >= 200 && $status < 300) {
                    DB::table('idempotency_records')->where('key_hash', $keyHash)->update([
                        'response_status' => $status,
                        'response_content' => $response->getContent(),
                        'response_type' => $response->headers->get('Content-Type', 'application/json'),
                        'updated_at' => now(),
                    ]);
                } else {
                    // Failures aren't cached; clients can retry after correcting
                    // the problem. No successful mutation should return a 4xx.
                    DB::table('idempotency_records')->where('key_hash', $keyHash)->delete();
                }

                return $response;
            }, 3);
        } catch (QueryException $exception) {
            // Another request with this key won the unique-index race. Its
            // transaction has completed (or failed), so read the durable result.
            $saved = DB::table('idempotency_records')
                ->where('key_hash', $keyHash)
                ->where('expires_at', '>', now())
                ->first();

            if ($saved) {
                return $this->replayOrConflict($saved, $requestHash);
            }

            throw $exception;
        }
    }

    private function who(Request $request): string
    {
        if ($user = AuthSessions::resolve($request)['user']) {
            return "user:{$user->id}";
        }

        return ($session = $request->header('X-Session-Token'))
            ? 'session:'.hash('sha256', $session)
            : 'ip:'.$request->ip();
    }

    private function replayOrConflict(object $saved, string $requestHash)
    {
        if (! hash_equals($saved->request_hash, $requestHash)) {
            return response()->json([
                'message' => 'تم استخدام مفتاح الطلب نفسه مع بيانات مختلفة. استخدم مفتاحًا جديدًا.',
                'code' => 'IDEMPOTENCY_KEY_REUSED',
            ], 409);
        }

        // A row with no response is not visible until its transaction commits;
        // this guard is defensive for manually edited/inconsistent records.
        if ($saved->response_status === null || $saved->response_content === null) {
            return response()->json([
                'message' => 'الطلب نفسه ما زال قيد التنفيذ. حاول بعد لحظات.',
                'code' => 'IDEMPOTENCY_IN_PROGRESS',
            ], 409, ['Retry-After' => '2']);
        }

        return response($saved->response_content, (int) $saved->response_status, [
            'Content-Type' => $saved->response_type ?: 'application/json',
            'Idempotent-Replay' => 'true',
        ]);
    }
}
