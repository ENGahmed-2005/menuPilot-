# Realtime updates (Laravel Reverb)

Screens update the moment something changes, instead of asking the server
every few seconds. Until Reverb is running, nothing changes: every screen
keeps refreshing on its timer.

## How it works

- After a successful change through the API (a new order, a status, a
  payment…), `App\Http\Middleware\BroadcastChanges` sends a small **signal**
  — "orders changed", "tables changed" — once the response has gone out.
- Signals carry **no data**. Each screen refetches through the API it
  already uses, with its usual permissions.
- Channels (`App\Support\Realtime`, `routes/channels.php`):
  - `private-restaurant.{ownerId}` — the owner and that restaurant's staff
    (signed by `POST /api/broadcasting/auth`); topics `orders`, `tables`, `outside`
  - `session.{key}` — a guest's dining session (key from `GET /api/public/sessions/{id}`)
  - `outside.{key}` — an online order's tracking page
- The backend publishes with `App\Broadcasting\PusherProtocolBroadcaster`
  (Pusher HTTP API, which Reverb speaks), so the API service needs no extra
  PHP package. The browser uses Laravel Echo (`frontend/src/realtime`).
- If the socket can't connect or drops, screens fall back to their timer,
  and refetch once when it reconnects.

## Turning it on

### 1. Install Reverb (once, on a developer machine)

```bash
cd backend
composer require laravel/reverb
git add composer.json composer.lock && git commit -m "Add Laravel Reverb" && git push
```

Choose the app credentials (any random strings):

```
REVERB_APP_ID=menupilot
REVERB_APP_KEY=<random, 20+ chars>
REVERB_APP_SECRET=<random, 32+ chars>
```

### 2. Render — a new Web Service for Reverb

Same repository, root `backend`, same build command as the API, and:

- **Start command:** `php artisan reverb:start --host=0.0.0.0 --port=$PORT`
- **Environment:** `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET`,
  `REVERB_SERVER_HOST=0.0.0.0`, `REVERB_SERVER_PORT=$PORT`, `APP_KEY` (same as the API)
- Allowed origins: Reverb accepts every origin by default; to limit it,
  publish `config/reverb.php` and set `allowed_origins` to the Vercel domain.

Its public address, e.g. `menupilot-reverb.onrender.com`, is used below.

### 3. Render — the API service

```
BROADCAST_CONNECTION=realtime
REVERB_APP_ID / REVERB_APP_KEY / REVERB_APP_SECRET   (same as above)
REVERB_HOST=menupilot-reverb.onrender.com
REVERB_PORT=443
REVERB_SCHEME=https
```

### 4. Vercel — the frontend

```
VITE_REVERB_APP_KEY=<the same key>
VITE_REVERB_HOST=menupilot-reverb.onrender.com
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

Redeploy. The status chip on the kitchen screen turns to **«مباشر» / «Live»**
when the socket is connected.

## Turning it off

Set `BROADCAST_CONNECTION=null` on the API and remove `VITE_REVERB_APP_KEY`
from Vercel: everything goes back to refreshing on a timer.
