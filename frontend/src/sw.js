/* ==========================================================================
   sw.js — service worker (docs/offline.md)
   1) Precaches the app files, so every screen opens with no internet.
   2) Keeps the last good answer of each GET /api call (menu, kitchen orders,
      bills…). Network first (5 s): when the network fails or is slow, the saved
      answer is used, marked with X-Menupilot-Cache so the page can say so.
   Writes (POST/PATCH…) are never handled here: the app queues them itself
   (src/offline/outbox.js) because Safari has no Background Sync.
   ========================================================================== */
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { API_CACHE } from "./offline/storage"; // cleared there on sign-out

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

// A new version waits until the page agrees (see ConnectionBanner), so a
// cashier is never reloaded in the middle of a payment.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// Any page address (React Router) opens the app shell.
registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html"), { denylist: [/^\/__/] }));

// Live streams (SSE) and sign-in/sign-up calls go straight to the network.
const NEVER_CACHE = /\/api\/(broadcasting|auth\/(?!me$)|demo|password)|\/stream$/;
const isJson = (response) => (response.headers.get("content-type") || "").includes("json");

const withHeaders = async (response, extra) => {
  const headers = new Headers(response.headers);
  Object.entries(extra).forEach(([key, value]) => headers.set(key, value));
  return new Response(await response.clone().blob(), { status: response.status, statusText: response.statusText, headers });
};

registerRoute(
  ({ request, url }) => request.method === "GET" && url.pathname.includes("/api/") && !NEVER_CACHE.test(url.pathname),
  new NetworkFirst({
    cacheName: API_CACHE,
    networkTimeoutSeconds: 5, // long enough for a slow line, short enough for a dead one
    plugins: [
      {
        // Save only good JSON answers, stamped with the time we saved them.
        cacheWillUpdate: async ({ response }) => (response && response.status === 200 && isJson(response)
          ? withHeaders(response, { "x-menupilot-cached-at": String(Date.now()) })
          : null),
        // Reached only when the network failed: tell the page this is a saved copy.
        cachedResponseWillBeUsed: async ({ cachedResponse }) => (cachedResponse ? withHeaders(cachedResponse, { "x-menupilot-cache": "1" }) : cachedResponse),
      },
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  }),
);
