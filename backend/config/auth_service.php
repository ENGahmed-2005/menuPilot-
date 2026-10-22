<?php

/*
|--------------------------------------------------------------------------
| Better Auth service (auth/ at the repository root)
|--------------------------------------------------------------------------
|
| Sign-in, 2FA, Google, e-mail verification and password reset run in the
| Node auth service; Laravel only reads the sessions it writes to the shared
| database (auth_sessions) — App\Support\AuthSessions.
|
| secret: the auth service's BETTER_AUTH_SECRET. When set, the session
| cookie's HMAC signature is verified exactly like Better Auth does; when
| empty, the database lookup alone authenticates (the token is a long random
| secret). Never commit a real value.
|
*/

$prefix = env('AUTH_COOKIE_PREFIX', 'menupilot');

return [
    'secret' => env('BETTER_AUTH_SECRET'),
    'google_registration_cookies' => ["__Secure-{$prefix}.google_registration", "{$prefix}.google_registration"],

    // Better Auth names the cookie "<prefix>.session_token", with the
    // "__Secure-" prefix over https. Both are accepted (local dev is http).
    'session_cookies' => ["__Secure-{$prefix}.session_token", "{$prefix}.session_token"],

    // auth_sessions.updated_at feeds "last activity" on the Security page;
    // Laravel refreshes it at most this often.
    'touch_minutes' => 5,
];
