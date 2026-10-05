import { useEffect, useState } from "react";
import { getToken } from "../api/client";
import { getActiveSessions } from "../api/sessions";
import { useAuth } from "../context/AuthContext";
import { realtimeEnabled, restaurantChannel, useLive } from "../realtime";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
// See useOrderTracking: "polling" is for local development on Windows.
// The mock API (VITE_USE_MOCKS) has no streaming endpoint, so demos poll too.
const POLLING = import.meta.env.VITE_REALTIME_MODE === "polling" || import.meta.env.VITE_USE_MOCKS === "true";
const POLL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 3000;

async function consumeStream(url, onSessions, signal) {
  const response = await fetch(url, { headers: { Accept: "text/event-stream", Authorization: `Bearer ${getToken()}` }, signal });
  if (!response.ok || !response.body) throw new Error(`Realtime connection failed: ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!signal.aborted) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const block of events) {
      const eventName = block.match(/^event:\s*(.+)$/m)?.[1]?.trim();
      const data = block.match(/^data:\s*(.+)$/m)?.[1]?.trim();
      if (eventName === "sessions" && data) {
        try { onSessions(JSON.parse(data)); } catch { /* ignore malformed event */ }
      }
    }
  }
}

export function useWaiterRealtime(initialSessions = []) {
  const [sessions, setSessions] = useState(initialSessions);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();
  const reload = () => getActiveSessions().then((next) => { setSessions(next ?? []); setConnected(true); }).catch(() => setConnected(false));
  const live = useLive({ channel: realtimeEnabled ? restaurantChannel(user) : null, isPrivate: true, topics: ["tables", "orders"], onSignal: reload, pollMs: realtimeEnabled ? POLL_MS : 0 });

  useEffect(() => {
    let stopped = false;
    let controller;
    if (realtimeEnabled) { reload(); return () => { stopped = true; }; } // useLive keeps it fresh

    if (POLLING) {
      const load = () => getActiveSessions()
        .then((next) => { if (!stopped) { setSessions(next ?? []); setConnected(true); } })
        .catch(() => { if (!stopped) setConnected(false); });
      load();
      const timer = setInterval(load, POLL_MS);
      return () => { stopped = true; clearInterval(timer); };
    }

    async function connect() {
      if (stopped) return;
      controller = new AbortController();
      try {
        setConnected(true);
        await consumeStream(`${BASE_URL}/sessions/stream`, (next) => { if (!stopped) setSessions(next); }, controller.signal);
      } catch {
        if (!stopped) setConnected(false);
      }
      if (!stopped) { setConnected(false); setTimeout(connect, 800); }
    }

    connect();
    return () => { stopped = true; controller?.abort(); };
  }, []);

  return { sessions, setSessions, connected, live };
}
