/* ==========================================================================
   outbox.js — changes made while offline wait here, then are sent (docs/offline.md)
   Only the kitchen/cashier actions in RULES are queued; everything else
   (login, menu editing, customer orders…) simply fails with the usual
   «تعذّر الاتصال» message. A queued change keeps its place in order, carries
   an Idempotency-Key (the API never runs the same key twice), survives a
   reload (IndexedDB), and is sent when the server answers again.
   Nothing disappears silently: a change the server refuses — or that keeps
   failing — moves to `failed`, where staff see why and retry or dismiss it.
   ========================================================================== */
import { useSyncExternalStore } from "react";
import { BACK_ONLINE, getConnectivity } from "./connectivity";
import { USER_CHANGED, savedUser } from "./storage";
import { errorText } from "../utils/errors";
import { t } from "../i18n";

const DB_NAME = "menupilot-offline";
const STORE = "outbox";
const RETRY_MS = 15000;
// A change that keeps failing on the server (5xx, rate limit…) is given up
// after this many tries, so it can't hold back the ones behind it.
const MAX_ATTEMPTS = 5;
export const SYNCED = "menupilot:outbox-synced";

const ORDER_STATUS = { pending: t("جديدة"), preparing: t("قيد التحضير"), ready: t("جاهزة"), served: t("تم التقديم") };

/** Actions that may wait for the connection. `ref` is the id of the thing changed. */
const RULES = [
  { method: "PATCH", re: /^\/kitchen\/orders\/(\d+)\/status$/, kind: "order-status", label: (id, body) => t("حالة الطلب #{0}: {1}", { 0: id, 1: ORDER_STATUS[body?.status] || body?.status || "" }) },
  { method: "POST", re: /^\/sessions\/(\d+)\/payment$/, kind: "payment", label: (id) => t("تسجيل دفع الجلسة #{0}", { 0: id }) },
  { method: "POST", re: /^\/sessions\/(\d+)\/close$/, kind: "close", label: (id) => t("إغلاق الجلسة #{0}", { 0: id }) },
  { method: "POST", re: /^\/sessions\/(\d+)\/assistance\/resolve$/, kind: "assist", label: (id) => t("إنهاء نداء الجلسة #{0}", { 0: id }) },
];

/** {kind, ref, label} when this call may be queued, else null. */
export function matchRule(method, path, body) {
  for (const rule of RULES) {
    const m = rule.method === method && rule.re.exec(path);
    if (m) return { kind: rule.kind, ref: m[1], label: rule.label(m[1], body) };
  }
  return null;
}

/* ---- storage: IndexedDB when it works, this tab's memory otherwise ----- */
// Each op carries `stored`: true once IndexedDB confirmed the write. An op
// that is not stored (private mode, full quota, a lost connection) stays in
// memory and is never dropped by a reload.
let ops = [];
let ready = null;
let sender = null;
let seq = 0;
let syncing = false;
let again = false;
const listeners = new Set();
let snapshot = { pending: [], failed: [], syncing: false };

const idb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "key" });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
  request.onblocked = () => reject(new Error("IndexedDB blocked"));
});
const run = async (mode, work) => {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = work(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(request?.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error("IndexedDB transaction aborted")); };
  });
};
const hasIdb = () => typeof indexedDB !== "undefined";
const persist = (op) => (hasIdb() ? run("readwrite", (s) => s.put({ ...op, stored: true })).then(() => true, () => false) : Promise.resolve(false));
const unpersist = (key) => (hasIdb() ? run("readwrite", (s) => s.delete(key)).catch(() => {}) : Promise.resolve());
// null = the store could not be read (not "empty"): keep what this tab holds.
const loadAll = () => (hasIdb() ? run("readonly", (s) => s.getAll()).catch(() => null) : Promise.resolve(null));

const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("menupilot-outbox") : null;

// Changes belong to the person who made them and are only shown and sent while
// they are signed in (another person on the same tablet never sends them).
const currentUser = () => savedUser()?.id ?? null;
const isMine = (op, user = currentUser()) => user != null && (op.userId == null || op.userId === user);

function publish() {
  const user = currentUser();
  const mine = ops.filter((o) => isMine(o, user)).sort((a, b) => a.seq - b.seq);
  snapshot = { pending: mine.filter((o) => o.status === "pending"), failed: mine.filter((o) => o.status === "failed"), syncing };
  listeners.forEach((fn) => fn());
}

async function reload() {
  const saved = await loadAll();
  if (saved) {
    const keys = new Set(saved.map((o) => o.key));
    // Settled by another tab = it was stored and is gone now; unstored ops stay.
    ops = [...saved, ...ops.filter((o) => !keys.has(o.key) && !o.stored)];
  }
  seq = Math.max(seq, ...ops.map((o) => o.seq), 0);
  publish();
}

const init = () => (ready ??= reload());
const changed = () => { publish(); channel?.postMessage("changed"); };

async function save(op, patch) {
  Object.assign(op, patch);
  op.stored = await persist(op);
}

async function settle(op) {
  ops = ops.filter((o) => o.key !== op.key);
  await unpersist(op.key);
}

/** The function that really sends one queued call (set by api/client.js). */
export const setSender = (fn) => { sender = fn; };

export const newIdempotencyKey = () => globalThis.crypto?.randomUUID?.()
  ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

/** True when something is already waiting: new changes queue behind it, to keep their order. */
export const hasBacklog = () => snapshot.pending.length > 0;

export async function enqueue({ key, method, path, body, kind, ref, label }) {
  await init();
  const op = { key, method, path, body, kind, ref, label, status: "pending", attempts: 0, error: null, seq: ++seq, createdAt: Date.now(), userId: currentUser(), stored: false };
  ops.push(op);
  await save(op, {});
  changed();
  if (getConnectivity().online) flush();
  return op;
}

/* ---- sending ------------------------------------------------------------ */
// Worth retrying as is: the server is busy or down, or the request came too early.
const isTemporary = (err) => err.status >= 500 || [408, 429].includes(err.status) || err.code === "IDEMPOTENCY_IN_PROGRESS";

async function drain() {
  await reload();
  const user = currentUser();
  let sent = 0;
  for (const op of ops.filter((o) => o.status === "pending" && isMine(o, user)).sort((a, b) => a.seq - b.seq)) {
    try {
      await sender(op);
      await settle(op);
      sent++;
    } catch (err) {
      if (!err.status) break; // still offline: BACK_ONLINE or the timer tries again
      if (err.status === 401) { await save(op, { error: errorText(err) }); break; } // waits for a new sign-in
      const attempts = op.attempts + 1;
      if (isTemporary(err) && attempts < MAX_ATTEMPTS) { await save(op, { attempts, error: errorText(err) }); break; }
      await save(op, { status: "failed", attempts, error: errorText(err) }); // refused or given up: the next one goes on
    }
  }
  changed();
  if (sent) window.dispatchEvent(new Event(SYNCED));
}

/** Send what is waiting, oldest first. Only one tab sends at a time. */
export async function flush() {
  if (!sender) return;
  if (syncing) { again = true; return; }
  syncing = true;
  publish();
  try {
    await init();
    do {
      again = false;
      if (navigator.locks) await navigator.locks.request("menupilot-outbox", { ifAvailable: true }, (lock) => (lock ? drain() : null));
      else await drain();
    } while (again && snapshot.pending.length);
  } finally {
    syncing = false;
    publish();
  }
}

/** A failed change: send it again. */
export async function retry(key) {
  const op = ops.find((o) => o.key === key);
  if (!op) return;
  await save(op, { status: "pending", attempts: 0, error: null });
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

/** Starts the outbox once (main.jsx): loads waiting changes and sends them whenever possible. */
let started = false;
export function startOutbox() {
  if (started || typeof window === "undefined") return;
  started = true;
  init();
  if (channel) channel.onmessage = () => { reload(); };
  window.addEventListener(USER_CHANGED, publish);
  window.addEventListener(BACK_ONLINE, flush);
  window.addEventListener("focus", flush);
  setInterval(() => { if (getConnectivity().online) flush(); }, RETRY_MS);
}
