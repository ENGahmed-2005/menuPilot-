/* ==========================================================================
   Realtime (docs/realtime.md) — Laravel Echo over Laravel Reverb.
   useLive() keeps a screen fresh: it refreshes on a timer until the socket
   has subscribed to the channel, then only when a signal arrives (plus a
   slow safety refresh), and goes back to the timer if the socket drops.
   Without VITE_REVERB_APP_KEY nothing connects and every screen keeps its
   timer, as before. Echo and pusher-js load only when realtime is on.
   ========================================================================== */
import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { getSession } from "../api/sessions";

const KEY = import.meta.env.VITE_REVERB_APP_KEY;
export const realtimeEnabled = Boolean(KEY) && import.meta.env.VITE_USE_MOCKS !== "true";
const SAFETY_MS = 60000;

let client = null;
let connection = "connecting";
const connectionListeners = new Set();

function echo() {
  if (!realtimeEnabled) return Promise.resolve(null);
  client ??= Promise.all([import("laravel-echo"), import("pusher-js")]).then(([{ default: Echo }, { default: Pusher }]) => {
    window.Pusher = Pusher;
    const scheme = import.meta.env.VITE_REVERB_SCHEME || "https";
    const port = Number(import.meta.env.VITE_REVERB_PORT) || (scheme === "https" ? 443 : 80);
    const instance = new Echo({
      broadcaster: "reverb",
      key: KEY,
      wsHost: import.meta.env.VITE_REVERB_HOST,
      wsPort: port,
      wssPort: port,
      forceTLS: scheme === "https",
      enabledTransports: ["ws", "wss"],
      // Private channels are signed by the API with the logged-in user's token.
      authorizer: (channel) => ({
        authorize: (socketId, done) => {
          api.post("/broadcasting/auth", { socket_id: socketId, channel_name: channel.name })
            .then((signed) => done(null, signed))
            .catch((err) => done(err, null));
        },
      }),
    });
    instance.connector.pusher.connection.bind("state_change", ({ current }) => {
      connection = current;
      connectionListeners.forEach((fn) => fn(current));
    });
    return instance;
  });
  return client;
}

/** The private channel of the logged-in user's restaurant, or null. */
export function restaurantChannel(user) {
  const owner = user?.subscription?.owner_id ?? (user?.role === "owner" ? user?.id : null);
  return owner ? `restaurant.${owner}` : null;
}

/**
 * useLive({ channel, isPrivate, topics, onSignal, pollMs }) → true while live.
 * onSignal is called on every matching signal, on each (re)subscription, on
 * the timer while not live, and every minute as a safety net.
 */
export function useLive({ channel, isPrivate = false, topics = null, onSignal, pollMs = 0 }) {
  const handler = useRef(onSignal);
  handler.current = onSignal;
  const [live, setLive] = useState(false);
  const topicKey = topics ? topics.join(",") : "";

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    let safety = null;
    let subscription = null;
    const run = () => handler.current?.();
    const startPolling = () => { if (!timer && pollMs) timer = setInterval(run, pollMs); };
    const stopPolling = () => { clearInterval(timer); timer = null; };
    const wanted = topicKey ? topicKey.split(",") : null;
    const listener = (e) => { if (!wanted || wanted.includes(e?.topic)) run(); };
    const onConnection = (state) => { if (state !== "connected") { setLive(false); startPolling(); } };

    startPolling(); // until the socket has subscribed
    if (!realtimeEnabled || !channel) return () => stopPolling();

    echo().then((instance) => {
      if (cancelled || !instance) return;
      subscription = isPrivate ? instance.private(channel) : instance.channel(channel);
      subscription.listen(".signal", listener);
      // Subscribed (and every re-subscription after a reconnect): catch up once, stop the timer.
      subscription.subscribed(() => { if (cancelled) return; stopPolling(); setLive(true); run(); });
      subscription.error(() => { if (cancelled) return; setLive(false); startPolling(); });
      connectionListeners.add(onConnection);
      onConnection(connection);
      safety = setInterval(run, SAFETY_MS);
    }).catch(() => { /* keep the timer */ });

    return () => {
      cancelled = true;
      stopPolling();
      clearInterval(safety);
      connectionListeners.delete(onConnection);
      subscription?.stopListening(".signal", listener);
    };
  }, [channel, isPrivate, pollMs, topicKey]);

  return live;
}

/** A guest's session channel (from the session itself), or null. */
export function useSessionChannel(sessionId) {
  const [channel, setChannel] = useState(null);
  useEffect(() => {
    if (!realtimeEnabled || !sessionId) return undefined;
    let active = true;
    getSession(sessionId).then((s) => { if (active) setChannel(s?.realtime_channel || null); }).catch(() => {});
    return () => { active = false; };
  }, [sessionId]);
  return channel;
}
