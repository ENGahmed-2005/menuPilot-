# Working offline

Internet cuts must not stop the kitchen or the cashier. The app is an
installable PWA; the screens keep working on what they already have and send
their changes when the connection returns.

## What happens during an outage

| Screen action | Offline behaviour |
| --- | --- |
| Open the app / any screen | Works: the service worker has the app files and fonts. Staff see an offline banner; public pages don't. |
| See orders, tables, bills, menu | Shows the **last saved answer** of each call, with a banner and its time. |
| Kitchen: change an order's status | Shown at once, marked «بانتظار المزامنة», sent later. |
| Cashier: record a payment, close a session, resolve a waiter call | Saved on the device, sent later (a saved payment can't be taken twice). |
| New orders from guests' phones | **Not received** until the connection returns — the kitchen can't fetch what the server hasn't sent. |
| Everything else (login, menu editing, guest ordering…) | Fails with the usual «تعذّر الاتصال» message. |

## How it works

- `frontend/src/sw.js` — precaches the build; `GET /api/*` is **network first
  (5 s)** and falls back to the saved copy, marked `X-Menupilot-Cache`.
  Writes are never handled here: Safari has no Background Sync.
- `offline/connectivity.js` — «online» means our own calls reach the server (a
  router with no internet still reports `navigator.onLine = true`). While
  offline it checks `/up` every 8 s and announces the return.
- `offline/outbox.js` — the queue (IndexedDB, survives reloads; shared across tabs):
  - which calls may wait is the `RULES` table;
  - a new change queues behind older ones, so order is kept;
  - each carries an `Idempotency-Key`; the API (`Idempotency` middleware)
    replays the first answer for a repeated key from the same account (also
    after signing in again) instead of running it twice;
  - offline: it waits; an expired login (401): it waits for a new sign-in and
    the banner says why; 5xx/408/429: retried up to 5 times, then it is given
    up; a change the server refuses (order cancelled meanwhile…) goes straight
    to the **failed** list in the banner, to retry or dismiss;
  - an op is kept in the tab's memory until IndexedDB confirms it, so a
    failed write (private mode, full quota) never makes it disappear;
  - changes belong to the user who made them and are only sent under that user.
- Saved answers and the saved user are removed on sign-out and when the server
  rejects the login (`offline/storage.js`).
- After a sync the `menupilot:outbox-synced` event makes the kitchen, tables
  and bill screens re-read the server.

## Adding another action to the queue

1. Add a row to `RULES` in `offline/outbox.js`.
2. The caller gets `{ queued: true }` instead of the data: show a
   «saved, will be sent» message and don't offer the action again
   (see `Billing.jsx`, `CloseSessionButton.jsx`).
3. If a list screen re-reads the data, overlay waiting changes with
   `useOutbox()` (see `KitchenDashboard.jsx`, `TableStatus.jsx`).
4. The `Idempotency` middleware covers 2xx answers for any route.

## Deploying

Serve `/sw.js` and `/manifest.webmanifest` from the site root with
`Cache-Control: no-cache` (Netlify/Vercel defaults are fine). A new version
waits until staff press «تحديث الآن», so nobody is reloaded mid-payment.
The API's CORS now allows `Idempotency-Key`.
