<?php

namespace App\Support;

use App\Events\RealtimeSignal;
use Illuminate\Support\Facades\Log;

/**
 * Realtime signals (docs/realtime.md).
 *  restaurant.{ownerId}   private — the owner and the restaurant's staff
 *                         topics: orders, tables, outside
 *  session.{key}          public, unguessable — a guest's dining session
 *  outside.{key}          public, unguessable — an online order's tracking
 * Keys are HMACs of the id with the app key, handed only to whoever can
 * already read that session or order.
 */
class Realtime
{
    public static function enabled(): bool
    {
        return ! in_array(config('broadcasting.default'), ['null', 'log', null], true);
    }

    public static function sessionChannel(int $sessionId): string
    {
        return 'session.'.substr(hash_hmac('sha256', 'session:'.$sessionId, (string) config('app.key')), 0, 40);
    }

    public static function outsideChannel(int $orderId): string
    {
        return 'outside.'.substr(hash_hmac('sha256', 'outside:'.$orderId, (string) config('app.key')), 0, 40);
    }

    public static function restaurant(int $ownerId, string $topic): void
    {
        self::send('restaurant.'.$ownerId, true, $topic);
    }

    public static function session(int $sessionId, string $topic = 'session'): void
    {
        self::send(self::sessionChannel($sessionId), false, $topic);
    }

    public static function outside(int $orderId): void
    {
        self::send(self::outsideChannel($orderId), false, 'outside');
    }

    private static function send(string $channel, bool $private, string $topic): void
    {
        if (! self::enabled()) {
            return;
        }
        try {
            event(new RealtimeSignal($channel, $private, $topic));
        } catch (\Throwable $e) {
            Log::warning('Realtime signal failed: '.$e->getMessage());
        }
    }
}
