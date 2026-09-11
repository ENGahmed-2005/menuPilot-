import { useEffect, useState } from "react";
import { getToken } from "../api/client";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

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

  useEffect(() => {
    let stopped = false;
    let controller;

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

  return { sessions, setSessions, connected };
}
