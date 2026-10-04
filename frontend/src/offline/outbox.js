/* ==========================================================================
   outbox.js — changes made while offline wait here, then are sent (docs/offline.md)
   Only the kitchen/cashier actions listed in RULES are queued; everything
   else (login, menu editing, customer orders…) simply fails with the usual
   «تعذّر الاتصال» message. A queued change keeps its place in order, carries
   an Idempotency-Key (the API never runs the same key twice), survives a
   reload (IndexedDB), and is sent when the server answers again. A change the
   server refuses (an order that was cancelled meanwhile…) moves to `failed`,
   where staff see why and can retry or dismiss it — nothing disappears.
   ========================================================================== */
import { useSyncExternalStore } from "react";
import { BACK_ONLINE, getConnectivity } from "./connectivity";
import { savedUser } from "./storage";
import { errorText } from "../utils/errors";
import { t } from "../i18n";

const DB_NAME = "menupilot-offline";
const STORE = "outbox";
const RETRY_MS = 15000;
export const SYNCED = "menupilot:outbox-synced";

/** Actions that may wait for the connection. `ref` is the id of the thing changed. */
const RULES = [
  { method: "PATCH", re: /^\/(?:kitchen\/)?orders\/(\d+)\/status$/, kind: "order-status", label: (id, body) => t("حالة الطلب #{0}: {1}", { 0: id, 1: body?.status ?? "" }) },
  { method: "POST", re: /^\/sessions\/(\d+)\/payment$/, kind: "payment", label: (id) => t("تسجيل دفع الجلسة #{0}", { 0: id }) },
  { method: "POST", re: /^\/sessions\/(\d+)\/close$/, kind: "close", label: (id) => t("إغلاق الجلسة #{0}", { 0: id }) },
  { method: "POST", re: /^\/sessions\/(\d+)\/assistance\/resolve$/, kind: "assist", label: (id) => t("إنهاء نداء الجلسة #{0}", { 0: id }) },
  { method: "POST", re: /^\/order-items\/(\d+)\/cancel$/, kind: "item-cancel", label: (id) => t("إلغاء الصنف #{0}", { 0: id }) },
  { method: "POST", re: /^\/orders\/(\d+)\/cancel$/, kind: "order-cancel", label: (id) => t("إلغاء الطلب #{0}", { 0: id }) },
];

/** {kind, ref, label} when this call may be queued, else null. */
export function matchRule(method, path, body) {
  for (const rule of RULES) {
    const m = rule.method === method && rule.re.exec(path);
    if (m) return { kind: rule.kind, ref: m[1], label: rule.label(m[1], body) };
  }
  return null;
}

/* ---- storage: IndexedDB when available, memory otherwise --------------- */
let ops = [];
let ready = null;
let sender = null;
let seq = 0;
const listeners = new Set();
let snapshot = { pending: [], failed: [], syncing: false };
let syncing = false;

const idb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "key" });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const run = async (mode, work) => {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const result = work(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(result?.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
};
const persist = (op) => run("readwrite", (s) => s.put(op)).catch(() => {});
const unpersist = (key) => run("readwrite", (s) => s.delete(key)).catch(() => {});
const loadAll = () => run("readonly", (s) => s.getAll()).catch(() => []);

const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("menupilot-outbox") : null;

function publish() {
  const user = savedUser()?.id ?? null;
  const mine = ops.filter((o) => o.userId == null || user == null || o.userId === user).sort((a, b) => a.seq - b.seq);
  snapshot = { pending: mine.filter((o) => o.status === "pending"), failed: mine.filter((o) => o.status === "failed"), syncing };
  listeners.forEach((fn) => fn());
}

async function reload() {
  const saved = typeof indexedDB === "undefined" ? [] : await loadAll();
  // Keep what this tab holds that is not stored yet (storage unavailable).
  const stored = new Set(saved.map((o) => o.key));
  ops = [...saved, ...ops.filter((o) => !stored.has(o.key) && o.memoryOnly)];
  seq = Math.max(seq, ...ops.map((o) => o.seq), 0);
  publish();
}

export const init = () => (ready ??= reload());
if (channel) channel.onmessage = () => { reload(); };
const changed = () => { publish(); channel?.postMessage("changed"); };

/** The function that really sends one queued call (set by api/client.js). */
export const setSender = (fn) => { sender = fn; };

const newKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
export const newIdempotencyKey = newKey;

/** True when something is already waiting: new changes queue behind it, to keep their order. */
export const hasBacklog = () => snapshot.pending.length > 0;

export async function enqueue({ key, method, path, body, kind, ref, label }) {
  await init();
  const op = { key: key || newKey(), method, path, body, kind, ref, label, status: "pending", attempts: 0, error: null, seq: ++seq, createdAt: Date.now(), userId: savedUser()?.id ?? null, memoryOnly: typeof indexedDB === "undefined" };
  ops.push(op);
  changed();
  await persist(op);
  if (getConnectivity().online) flush();
  return op;
}

const settle = async (op) => { ops = ops.filter((o) => o.key !== op.key); await unpersist(op.key); };
const update = async (op, patch) => { Object.assign(op, patch); await persist(op); };

/* ---- sending ------------------------------------------------------------ */
// Network down, the server busy or the login expired: wait and try again.
const isTemporary = (err) => !err.status || err.status >= 500 || [401, 408, 429].includes(err.status) || err.code === "IDEMPOTENCY_IN_PROGRESS";

let retryTimer = null;
const scheduleRetry = () => { clearTimeout(retryTimer); retryTimer = setTimeout(flush, RETRY_MS); };

async function drain() {
  await reload();
  const user = savedUser()?.id ?? null;
  let sent = 0;
  for (const op of ops.filter((o) => o.status === "pending" && (o.userId == null || user == null || o.userId === user)).sort((a, b) => a.seq - b.seq)) {
    try {
      await sender(op);
      await settle(op);
      sent++;
    } catch (err) {
      if (isTemporary(err)) { if (err.status !== 0) scheduleRetry(); break; }
      await update(op, { status: "failed", error: errorText(err), attempts: op.attempts + 1 });
    }
  }
  changed();
  if (sent) window.dispatchEvent(new Event(SYNCED));
}

/** Send what is waiting, oldest first. Only one tab does it at a time. */
export async function flush() {
  if (syncing || !sender) return;
  await init();
  if (!snapshot.pending.length) return;
  syncing = true;
  publish();
  try {
    if (navigator.locks) await navigator.locks.request("menupilot-outbox", { ifAvailable: true }, (lock) => (lock ? drain() : null));
    else await drain();
  } finally {
    syncing = false;
    publish();
  }
}

/** A failed change: send it again. */
export async function retry(key) {
  const op = ops.find((o) => o.key === key);
  if (!op) return;
  await update(op, { status: "pending", error: null });
  changed();
  flush();
}

/** A failed change: forget it. */
export async function dismiss(key) {
  const op = ops.find((o) => o.key === key);
  if (!op) return;
  await settle(op);
  changed();
}

/* ---- for screens --------------------------------------------------------- */
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const getSnapshot = () => snapshot;
export const useOutbox = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

/** ids (as strings) of things with a waiting change of this kind. */
export const queuedRefs = (outbox, kind) => new Set(outbox.pending.filter((o) => o.kind === kind).map((o) => String(o.ref)));

/** The newest waiting status per order: Map<orderId, status>. */
export function queuedOrderStatuses(outbox) {
  const map = new Map();
  outbox.pending.filter((o) => o.kind === "order-status").forEach((o) => map.set(String(o.ref), String(o.body?.status || "").toLowerCase()));
  return map;
}

if (typeof window !== "undefined") {
  init();
  window.addEventListener(BACK_ONLINE, flush);
  window.addEventListener("focus", flush);
  setInterval(() => { if (getConnectivity().online) flush(); }, RETRY_MS);
}
