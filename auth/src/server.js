/* server.js — the auth service's HTTP side (Hono on Node).
     /api/auth/*       Better Auth (proxied same-origin by the frontend)
     /api/auth-config  what the sign-in screens may offer (no secrets)
     /health           ready to sign people in: database reachable, schema migrated
     /live             the process is up (platform health checks)
   It may start before Laravel has migrated the auth tables (both deploy from
   the same push): until the schema matches, /api/auth/* answers 503 and the
   check is retried every 15 s. */
import { pathToFileURL } from "node:url";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { sql } from "kysely";
import { auth, checkSchema } from "./auth.js";
import { config } from "./config.js";
import { closeDb, db } from "./db.js";
import { CLIENT_IP_HEADER, resolveClientIp } from "./ip.js";
import { mailEnabled } from "./mail.js";

const NO_STORE = { "Cache-Control": "no-store" };
const RETRY_MS = 15_000;

let ready = false;
/** Resolves once Laravel's schema matches (retrying meanwhile). */
export async function waitForSchema() {
  for (;;) {
    try {
      await checkSchema();
      ready = true;
      return;
    } catch (error) {
      console.warn(`[auth] waiting for the database schema (Laravel migrations): ${String(error?.message || error).slice(0, 300)}`);
      await new Promise((r) => setTimeout(r, RETRY_MS));
    }
  }
}

export const app = new Hono();

app.use("*", secureHeaders({ crossOriginResourcePolicy: "same-origin" }));

app.get("/live", (c) => c.json({ ok: true }, 200, NO_STORE));
app.get("/health", async (c) => {
  try {
    await sql`select 1`.execute(db);
    return c.json({ ok: ready, ready }, ready ? 200 : 503, NO_STORE);
  } catch {
    return c.json({ ok: false, ready }, 503, NO_STORE);
  }
});

app.get("/api/auth-config", (c) => c.json({
  emailEnabled: mailEnabled,
  googleEnabled: Boolean(config.google),
  emailVerificationRequired: config.requireEmailVerification,
}, 200, NO_STORE));

/** The request Better Auth sees: our client-IP header, set here and never taken from outside. */
async function forAuth(c) {
  const req = c.req.raw;
  const headers = new Headers(req.headers);
  headers.delete(CLIENT_IP_HEADER);
  const ip = resolveClientIp(headers, config.clientIp, c.env?.incoming?.socket?.remoteAddress);
  if (ip) headers.set(CLIENT_IP_HEADER, ip);
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  return new Request(req.url, { method: req.method, headers, body });
}

/* An error raised in an after-hook keeps the endpoint's status: the 5th wrong
   password answers ACCOUNT_LOCKED with the 401 of the wrong password. */
async function withLockStatus(res) {
  if (res.status !== 401 || !res.headers.get("content-type")?.includes("json")) return res;
  const text = await res.text();
  return new Response(text, { status: text.includes('"code":"ACCOUNT_LOCKED"') ? 429 : 401, headers: res.headers });
}

app.on(["GET", "POST"], "/api/auth/*", bodyLimit({ maxSize: 64 * 1024 }), async (c) => {
  if (!ready) return c.json({ code: "AUTH_NOT_READY", message: "Sign-in is starting, try again in a minute." }, 503, { ...NO_STORE, "Retry-After": "30" });
  return withLockStatus(await auth.handler(await forAuth(c)));
});

app.notFound((c) => c.json({ message: "Not found" }, 404));
app.onError((error, c) => {
  console.error("[auth] unhandled error:", error?.message || error);
  return c.json({ message: "Internal server error" }, 500);
});

export function start(port = config.port) {
  const server = serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
    console.log(`[auth] listening on :${info.port} (${config.production ? "production" : "development"}; e-mail ${mailEnabled ? "on" : "off"}; Google ${config.google ? "on" : "off"})`);
  });
  waitForSchema().then(() => console.log("[auth] database schema ready"));
  const stop = () => server.close(() => closeDb().finally(() => process.exit(0)));
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) start();
