<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Better Auth sessions, seen from Laravel.
 *
 * The auth service (auth/) signs people in and writes `auth_sessions`; the
 * browser then carries its httpOnly cookie to every same-origin /api call.
 * Laravel only reads that row: who is signed in, and is the session still
 * valid. Revoking = deleting the rows, which bites on the very next request
 * (the auth service keeps no cookie cache).
 *
 * Credentials, in order:
 *  1. Authorization: Bearer <session token> (signed "token.signature" or the
 *     bare token, like Better Auth's bearer plugin), else the legacy
 *     api_token — honoured for demo accounts only (App\Support\DemoRestaurant);
 *  2. the session cookie, either name (config/auth_service.php).
 * An explicit Authorization header decides on its own: a demo visitor never
 * ends up acting on a real account through a leftover cookie.
 */
class AuthSessions
{
    public const OK = 'ok';

    /** No credential at all. */
    public const MISSING = 'missing';

    /** A credential that is unknown, expired, revoked, badly signed or legacy. */
    public const INVALID = 'invalid';

    private const RESOLVED = 'auth_sessions.resolved';

    /**
     * Who the request belongs to. Cached on the request, so Idempotency (which
     * runs first) and ApiAuth share one lookup.
     *
     * @return array{status: string, user: ?User, via: ?string, session: ?object}
     */
    public static function resolve(Request $request): array
    {
        if ($request->attributes->has(self::RESOLVED)) {
            return $request->attributes->get(self::RESOLVED);
        }

        $result = self::lookup($request);
        $request->attributes->set(self::RESOLVED, $result);

        return $result;
    }

    /** Signs every given account out of every device. */
    public static function revokeFor(int ...$userIds): void
    {
        $userIds = array_values(array_unique(array_filter($userIds)));
        if ($userIds) {
            DB::table('auth_sessions')->whereIn('user_id', $userIds)->delete();
        }
    }

    /** "Last activity" for the devices list, written at most every few minutes. */
    public static function touch(object $session): void
    {
        $minutes = (int) config('auth_service.touch_minutes', 5);
        if (! $session->updated_at || now()->subMinutes($minutes)->gt($session->updated_at)) {
            DB::table('auth_sessions')->where('id', $session->id)->update(['updated_at' => now()]);
        }
    }

    /**
     * The session token inside a cookie value ("<token>.<signature>", already
     * URL-decoded). With a secret configured the signature must match, as in
     * better-call's getSignedCookie: HMAC-SHA256 of everything before the last
     * ".", base64 with padding (44 characters ending in "="), compared in
     * constant time. Without a secret, the part before the first ".".
     */
    public static function tokenFromSignedValue(string $value, ?string $secret): ?string
    {
        if ($secret === null || $secret === '') {
            $token = explode('.', $value, 2)[0];

            return $token !== '' ? $token : null;
        }

        $dot = strrpos($value, '.');
        if ($dot === false || $dot < 1) {
            return null;
        }
        $token = substr($value, 0, $dot);
        $signature = substr($value, $dot + 1);
        if (strlen($signature) !== 44 || ! str_ends_with($signature, '=')) {
            return null;
        }
        $given = base64_decode($signature, true);

        return $given !== false && hash_equals(hash_hmac('sha256', $token, $secret, true), $given) ? $token : null;
    }

    /** @return array{status: string, user: ?User, via: ?string, session: ?object} */
    private static function lookup(Request $request): array
    {
        $secret = config('auth_service.secret');

        if (($bearer = self::bearer($request)) !== null) {
            // Signed like the cookie (contains "."), or the bare token.
            $decoded = str_contains($bearer, '%') ? rawurldecode($bearer) : $bearer;
            $token = str_contains($decoded, '.') ? self::tokenFromSignedValue($decoded, $secret) : $decoded;
            if ($found = self::fromSession($token, 'bearer')) {
                return $found;
            }

            // Legacy api_token: only the shared demo accounts still use it.
            $legacy = User::where('api_token', hash('sha256', $bearer))->first();
            if ($legacy && $legacy->is_demo) {
                return ['status' => self::OK, 'user' => $legacy, 'via' => 'legacy', 'session' => null];
            }

            return self::invalid();
        }

        if (($cookie = self::cookie($request)) !== null) {
            return self::fromSession(self::tokenFromSignedValue($cookie, $secret), 'cookie') ?? self::invalid();
        }

        return ['status' => self::MISSING, 'user' => null, 'via' => null, 'session' => null];
    }

    /** @return array{status: string, user: ?User, via: ?string, session: ?object}|null */
    private static function fromSession(?string $token, string $via): ?array
    {
        if ($token === null || $token === '' || strlen($token) > 255) {
            return null;
        }
        $session = DB::table('auth_sessions')->where('token', $token)->where('expires_at', '>', now())
            ->first(['id', 'user_id', 'updated_at']);
        $user = $session ? User::find($session->user_id) : null;

        return $user ? ['status' => self::OK, 'user' => $user, 'via' => $via, 'session' => $session] : null;
    }

    /** @return array{status: string, user: null, via: null, session: null} */
    private static function invalid(): array
    {
        return ['status' => self::INVALID, 'user' => null, 'via' => null, 'session' => null];
    }

    /** The Bearer value; an old app's "Bearer null" counts as no header. */
    private static function bearer(Request $request): ?string
    {
        if (! preg_match('/^Bearer\s+(.+)$/i', (string) $request->header('Authorization', ''), $m)) {
            return null;
        }
        $value = trim($m[1]);

        return in_array($value, ['', 'null', 'undefined'], true) ? null : $value;
    }

    /**
     * The session cookie, read from the raw Cookie header: PHP's $_COOKIE turns
     * the "." of "menupilot.session_token" into "_". Parsed like better-call
     * (first occurrence wins, quotes stripped, URL-decoded).
     */
    private static function cookie(Request $request): ?string
    {
        $names = (array) config('auth_service.session_cookies', []);
        $found = [];
        foreach (explode(';', (string) $request->headers->get('cookie', '')) as $pair) {
            $eq = strpos($pair, '=');
            if ($eq === false) {
                continue;
            }
            $name = trim(substr($pair, 0, $eq));
            if (in_array($name, $names, true) && ! array_key_exists($name, $found)) {
                $value = trim(substr($pair, $eq + 1));
                if (str_starts_with($value, '"') && str_ends_with($value, '"') && strlen($value) >= 2) {
                    $value = substr($value, 1, -1);
                }
                $found[$name] = rawurldecode($value);
            }
        }

        foreach ($names as $name) {
            $value = $found[$name] ?? $request->cookies->get($name) ?? $request->cookies->get(str_replace('.', '_', $name));
            if (is_string($value) && $value !== '') {
                return $value;
            }
        }

        return null;
    }
}
