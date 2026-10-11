# menuPilot auth service

Better Auth 1.7.7 on Hono, sharing Laravel's MySQL database: password sign-in
with account lockout, two-step verification (TOTP + backup codes), devices,
Google for existing accounts, e-mail confirmation and password reset.
Laravel reads the sessions it writes. Full guide: [`docs/auth.md`](../docs/auth.md).

```bash
cp .env.example .env    # BETTER_AUTH_SECRET + Laravel's database
npm install
npm run dev             # :3005, the frontend's Vite proxies /api/auth here
npm test                # needs a migrated MySQL/MariaDB database named *test*
```

| File | |
| --- | --- |
| `src/server.js` | HTTP: `/api/auth/*`, `/api/auth-config`, `/health`, `/live` |
| `src/auth.js` | Better Auth configuration (tables, plugins, rules, hooks) |
| `src/gates.js` | Lockout, who may sign in, password sync with Laravel |
| `src/devices.js` | Devices list without tokens; sign a device out by id |
| `src/passwords.js` | bcrypt (`$2y$`, like Laravel) and the password rule |
| `src/mail.js` | Confirmation and reset e-mails |
| `src/ip.js` | Client IP behind the proxies |
