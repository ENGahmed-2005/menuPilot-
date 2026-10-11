# Sign-in and account security

menuPilot signs people in with [Better Auth](https://better-auth.com) 1.7.7,
running as a small Node service (`auth/`) next to Laravel, on the **same MySQL
database**. Laravel keeps owning accounts, roles, permissions and the schema;
the auth service only signs people in and out.

```
browser ──► frontend origin (Vercel / Railway / Vite)
              ├─ /api/auth/*, /api/auth-config ──► auth service (Better Auth, Hono)  ─┐
              ├─ /api/*, /up                   ──► Laravel                            ├─ same MySQL
              └─ everything else                ──► the React app (SPA)                ┘
```

The browser only ever talks to the frontend's own origin, which proxies the two
services (`frontend/vercel.json`, `frontend/Caddyfile`, `frontend/vite.config.js`).
So the session cookie is first-party, `httpOnly`, `SameSite=Lax`, `Secure` on
HTTPS, and never readable by JavaScript.

## What users get

| Feature | How |
| --- | --- |
| Password sign-in | `POST /api/auth/sign-in/email`. 5 wrong passwords lock the account for 15 minutes (`users.login_*`, the rule Laravel had). |
| Two-step verification (TOTP) | Security page: password → QR (drawn in the browser, the secret never leaves the page) → code → 10 backup codes. Asked at every new sign-in; "remember this device" for 30 days. Wrong codes are rate-limited and lock temporarily. |
| Devices | Security page lists every signed-in device (browser, OS, IP, last activity), marks this one, signs any other out, or all others at once. |
| Google | "Sign in with Google" for **existing** accounts only (same e-mail, Google-verified). No sign-up through Google. An account with two-step verification must use password + code. Linking/unlinking from the Security page. Hidden until `GOOGLE_CLIENT_ID/SECRET` are set. |
| Confirm e-mail | New owners (registered through Laravel) confirm their e-mail before the first sign-in, when e-mail is configured. Existing accounts, staff and admin-created owners count as confirmed. The link signs them in. |
| Reset password by e-mail | One-time link, valid 1 hour; the reset signs out every device. Without SMTP the app keeps the WhatsApp request to the platform team (Laravel, `/api/account/forgot-password`). |
| Change password | Security page, with "sign out of other devices". |

Password rule everywhere: at least 8 characters with upper- and lower-case
letters, a number and a symbol. Passwords found in public breaches are refused
in production (Have I Been Pwned, k-anonymity: only 5 hash characters leave the
server).

## How Laravel and the auth service share accounts

- **Tables** (Laravel migration `2026_10_10_100000_add_better_auth_tables`):
  `users` is Better Auth's user model (plus `email_verified`, `image`,
  `two_factor_enabled`); `auth_sessions`, `auth_accounts`, `auth_verifications`,
  `auth_two_factors`, `auth_rate_limits` mirror Better Auth's schema with
  32-character string ids. The auth service never migrates; at start it checks
  the schema and waits (503) until Laravel's migrations have run.
- **Sessions**: Better Auth writes `auth_sessions`; Laravel's `ApiAuth`
  middleware (`App\Support\AuthSessions`) reads the same row from the
  `menupilot.session_token` cookie (`__Secure-` on HTTPS). With
  `BETTER_AUTH_SECRET` set in Laravel too, the cookie's HMAC signature is
  checked. Every request checks the database (no cookie cache), so revoking a
  session, disabling an account or changing a role takes effect at once.
- **Passwords**: `users.password` stays the canonical bcrypt (`$2y$`) hash.
  Laravel writes the copy in the credential account whenever it sets a
  password (`App\Support\CredentialAccount`); the auth service refreshes it
  from `users.password` before a password sign-in and writes changes and
  resets back to it.
- **Who may sign in** (checked before any session is created, also for Google
  and e-mail links): disabled accounts, staff who were removed or re-roled,
  staff of a disabled restaurant, and demo accounts are refused
  (`ACCOUNT_DISABLED`).
- **Signing out everywhere**: Laravel deletes a user's sessions when the owner
  disables a staff member, changes their role or password, or the admin
  disables a restaurant (`AuthSessions::revokeFor`).
- **Registration** stays in Laravel (`POST /api/account/register`): it creates
  the restaurant and its trial. Better Auth's own sign-up is off.
- The **"Try it" demo** keeps its shared Bearer token (Laravel's legacy
  `api_token`, accepted only for `is_demo` accounts).
- Laravel's old `POST /api/auth/login` answers `410 USE_NEW_LOGIN`, so an app
  cached from before asks for a reload.

Laravel's account routes are served under `/api/account/*` (`me`, `register`,
`forgot-password`, `reset-password`, `logout`), because `/api/auth/*` belongs
to the auth service behind the proxy.

## Security details

- **CSRF**: cookies are `SameSite=Lax`; the auth service checks the `Origin`
  of every POST (sign-in included, against login CSRF); Laravel refuses
  cookie-authenticated writes marked `Sec-Fetch-Site: cross-site`.
- **No tokens in JavaScript**: session tokens are stripped from every JSON
  answer of the auth service (`devices.js`); devices are signed out by id.
  With the secret configured, Laravel accepts a Bearer session token only in
  its signed form.
- **Rate limits** per client IP (stored in `auth_rate_limits`): sign-in 10/min,
  2FA codes 10/min, reset/confirmation e-mails 5 per 15 min, password changes
  10 per 10 min, everything else 100/min. One address can receive at most 3
  e-mails per 15 minutes. The per-account lockout is what really stops
  password guessing; the IP limits slow scripts down.
- **Client IP**: read from the first header in `AUTH_CLIENT_IP_HEADER` that a
  request carries; proxies append to it, so the client is the entry
  `AUTH_PROXY_HOPS` places from the right (default 1). In production the auth
  service uses `x-vercel-forwarded-for,x-forwarded-for`: Vercel's rewrite sends
  the visitor in the first; the Railway frontend's Caddy sets the second to
  exactly the visitor and reaches the service over Railway's private network
  (Railway's public edge replaces `X-Forwarded-Host` and `X-Real-IP`). After
  deploying, check the IP shown for your device on the Security page; adjust
  these two settings if it shows a proxy. A request whose IP can't be read is
  not IP-limited (rather than sharing one bucket with everyone). The headers
  can be forged by calling the service directly, which only lets a client
  choose its own rate-limit bucket: the per-account lockout still applies.
- OAuth tokens from Google are encrypted at rest. The service logs no secrets,
  links or e-mail addresses.

## Settings (auth service)

| Variable | Default | Meaning |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | — (required, 32+ chars) | Signs cookies and encrypts 2FA secrets. Set the same value in Laravel. `openssl rand -base64 32` |
| `DATABASE_URL` or `DB_HOST` / `DB_PORT` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | local MySQL | Laravel's database. Railway's `MYSQL*` variables are read too. |
| `PORT` | 3005 | |
| `AUTH_ALLOWED_HOSTS` | `menupilot.vercel.app`, the Railway frontend (and `localhost:5173` outside production) | Hosts that proxy `/api/auth`. Links and cookies use the host a request came through, so list **exact** hosts: never a wildcard on a shared domain like `*.vercel.app` (anyone could create a matching project and receive reset links). |
| `AUTH_FALLBACK_URL` | `https://menupilot.vercel.app` | Base for links when the host isn't in the list. |
| `FRONTEND_ORIGINS` | — | Extra trusted origins, comma-separated. |
| `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE` | — | E-mail. Without `SMTP_HOST`, no e-mail features. |
| `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` | `no-reply@menupilot.app`, `menuPilot` | Sender. |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | `true` (when e-mail is on) | New owners confirm their e-mail first. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | — | Google sign-in. |
| `AUTH_CLIENT_IP_HEADER`, `AUTH_PROXY_HOPS` | `x-forwarded-for`, `1` | Where the client IP is read (comma-separated headers, first present wins). |
| `HOST` | `::` | Listen address (IPv4 + IPv6). |
| `AUTH_RATE_LIMIT` | `true` | |
| `AUTH_PWNED_CHECK` | `true` in production | Refuse breached passwords. |
| `AUTH_COOKIE_PREFIX` | `menupilot` | Must match Laravel's `AUTH_COOKIE_PREFIX`. |
| `MAIL_TRANSPORT` | — | Development only: `log` prints e-mails, `memory` keeps them (tests). |

Laravel (`backend/.env`): `BETTER_AUTH_SECRET` (optional but recommended: turns
on the cookie signature check) and `AUTH_COOKIE_PREFIX`.

### Google sign-in

In Google Cloud Console → APIs & Services → Credentials → OAuth client
(Web application), add one **Authorized redirect URI** per frontend:

- `https://menupilot.vercel.app/api/auth/callback/google`
- `https://frontend-production-351d.up.railway.app/api/auth/callback/google`
- `http://localhost:5173/api/auth/callback/google` (development)

Then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on the auth service.

## Running it locally

```bash
# 1. Laravel on :8000 (migrations create the auth tables)
cd backend && php artisan migrate && php artisan serve
# 2. Auth service on :3005
cd auth && cp .env.example .env   # set BETTER_AUTH_SECRET and the database
npm install && npm run dev
# 3. Frontend on :5173 (proxies /api/auth → :3005, /api → :8000)
cd frontend && npm run dev
```

With `MAIL_TRANSPORT=log`, the confirmation and reset e-mails (and their links)
appear in the auth service's console.

Tests: `cd auth && npm test` runs the service against a MySQL/MariaDB database
carrying Laravel's migrations; its name must contain `test` (the tests empty
the users and auth tables). `cd backend && ./vendor/bin/pest` covers Laravel's
side (`tests/Feature/AuthSessionsTest.php`). `scripts/smoke-test.mjs <frontend-url>`
walks the whole flow through a deployment.
