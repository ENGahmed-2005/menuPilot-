<?php

namespace App\Broadcasting;

use Illuminate\Broadcasting\Broadcasters\Broadcaster;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Publishes to a Pusher-protocol server (Laravel Reverb) over its HTTP API,
 * without the pusher-php-server package: a signed POST /apps/{id}/events.
 * Also signs private-channel subscriptions for the browser (Laravel Echo).
 * A failed publish is logged and never breaks the request that caused it.
 */
class PusherProtocolBroadcaster extends Broadcaster
{
    public function __construct(private array $config) {}

    public function auth($request)
    {
        $name = (string) $request->input('channel_name');
        if (! Str::startsWith($name, 'private-') || ! $request->user()) {
            throw new AccessDeniedHttpException;
        }

        return parent::verifyUserCanAccessChannel($request, Str::after($name, 'private-'));
    }

    public function validAuthenticationResponse($request, $result)
    {
        $channel = (string) $request->input('channel_name');
        $socket = (string) $request->input('socket_id');
        if (! preg_match('/^\d+\.\d+$/', $socket)) {
            throw new AccessDeniedHttpException;
        }

        return ['auth' => $this->config['key'].':'.hash_hmac('sha256', $socket.':'.$channel, (string) $this->config['secret'])];
    }

    public function broadcast(array $channels, $event, array $payload = [])
    {
        $path = '/apps/'.$this->config['app_id'].'/events';
        $body = json_encode([
            'name' => $event,
            'channels' => array_map('strval', $this->formatChannels($channels)),
            'data' => json_encode($payload),
        ]);
        $query = self::signedQuery('POST', $path, $body, (string) $this->config['key'], (string) $this->config['secret'], time());
        $url = sprintf('%s://%s:%d%s?%s', $this->config['scheme'], $this->config['host'], $this->config['port'], $path, http_build_query($query));

        try {
            Http::timeout($this->config['timeout'] ?? 2)->withBody($body, 'application/json')->post($url)->throw();
        } catch (\Throwable $e) {
            Log::warning('Realtime publish failed: '.$e->getMessage());
        }
    }

    /** The Pusher HTTP API signature (auth_version 1.0). */
    public static function signedQuery(string $method, string $path, string $body, string $key, string $secret, int $timestamp): array
    {
        $params = ['auth_key' => $key, 'auth_timestamp' => $timestamp, 'auth_version' => '1.0', 'body_md5' => md5($body)];
        ksort($params);
        $toSign = $method."\n".$path."\n".urldecode(http_build_query($params));

        return $params + ['auth_signature' => hash_hmac('sha256', $toSign, $secret)];
    }
}
