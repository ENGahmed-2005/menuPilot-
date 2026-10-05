/* ==========================================================================
   connectivity.js — are we really online? (docs/offline.md)
   navigator.onLine only says "connected to Wi-Fi", which is true when the
   router has no internet — the usual case in an outage. So the app watches
   its own calls instead: a failed call, or an answer the service worker
   served from its saved copy, means offline. While offline it checks the
   server every few seconds and announces the return.
   ========================================================================== */
import { useSyncExternalStore } from "react";
import { API_BASE_URL } from "../api/baseUrl";

const PROBE_MS = 8000;
const PROBE_TIMEOUT_MS = 6000;
export const BACK_ONLINE = "menupilot:back-online";

let state = { online: true, savedAt: null };
const listeners = new Set();
let probeTimer = null;

function set(patch) {
  const next = { ...state, ...patch };
  if (Object.keys(patch).every((k) => next[k] === state[k])) return;
  state = next;
  listeners.forEach((fn) => fn());
}

async function probe() {
  try {
    const origin = new URL(API_BASE_URL, window.location.href).origin;
    // no-cors: we only need to know the server answered, not read the answer.
    await fetch(`${origin}/up`, { mode: "no-cors", cache: "no-store", signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
    markOnline();
  } catch { /* still offline: the timer tries again */ }
}

function startProbing() {
  if (probeTimer || typeof window === "undefined") return;
  probeTimer = setInterval(probe, PROBE_MS);
}

function stopProbing() {
  clearInterval(probeTimer);
  probeTimer = null;
}

/** A call reached the server. */
export function markOnline() {
  const wasOffline = !state.online;
  set({ online: true, savedAt: null });
  stopProbing();
  if (wasOffline) window.dispatchEvent(new Event(BACK_ONLINE));
}

/** A call failed, or was answered from the saved copy taken at `savedAt`. */
export function markOffline(savedAt = null) {
  set({ online: false, savedAt: savedAt ?? state.savedAt });
  startProbing();
}

/** Reads a response: tells whether it came from the server or from the saved copy. */
export function noteResponse(response) {
  if (response.headers.get("x-menupilot-cache") === "1") markOffline(Number(response.headers.get("x-menupilot-cached-at")) || null);
  else markOnline();
}

export const getConnectivity = () => state;
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const useConnectivity = () => useSyncExternalStore(subscribe, getConnectivity, getConnectivity);

if (typeof window !== "undefined") {
  window.addEventListener("offline", () => markOffline());
  window.addEventListener("online", probe);
}
