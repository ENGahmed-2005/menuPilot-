#!/usr/bin/env node
/* ==========================================================================
   menuPilot — production smoke test (Go / No-Go)
   --------------------------------------------------------------------------
   Runs the whole restaurant flow against a live deployment over HTTP and
   prints a pass/fail line per check. Exit code 1 if anything fails. Give it
   the FRONTEND address: it serves /api (Laravel) and /api/auth (the auth
   service) on one origin, the way the browser uses them.

     node scripts/smoke-test.mjs https://menupilot.vercel.app

   Optional: admin credentials delete the temporary restaurant afterwards and,
   when new owners must confirm their e-mail, create the test restaurant:
     SMOKE_ADMIN_EMAIL=... SMOKE_ADMIN_PASSWORD=... node scripts/smoke-test.mjs <frontend-url>

   It creates a throw-away restaurant (smoke-<timestamp>@menupilot.test) with
   one table, one menu item, a kitchen and a cashier account, then walks:
     1 health  2 database  3 auth  4 customer  5 kitchen  6 cashier  7 session
   Requires Node 18+ (built-in fetch). No dependencies.
   ========================================================================== */

const ORIGIN = (process.argv[2] || process.env.SMOKE_URL || "http://localhost:5173").replace(/\/$/, "").replace(/\/api$/, "");
const API = `${ORIGIN}/api`;
const STAMP = Date.now();
const LAT = 31.5, LNG = 34.46;
const PASSWORD = `Smoke#${STAMP % 100000}Aa`;

const ADMIN = process.env.SMOKE_ADMIN_EMAIL && process.env.SMOKE_ADMIN_PASSWORD ? { email: process.env.SMOKE_ADMIN_EMAIL, password: process.env.SMOKE_ADMIN_PASSWORD } : null;
const created = []; // restaurants to delete afterwards: {id, email}
const results = [];
let failed = false;

function record(section, name, ok, detail = "") {
  results.push({ section, name, ok, detail });
  if (!ok) failed = true;
  console.log(`${ok ? "✅" : "❌"} [${section}] ${name}${detail ? ` — ${detail}` : ""}`);
}

/** HTTP helper: never throws; flags 5xx and leaked SQL/stack traces. `token` is a session cookie ("name=value"). */
async function call(method, path, { token, body, headers = {}, raw = false } = {}) {
  const url = path.startsWith("http") ? path : `${API}${path}`;
  const init = { method, headers: { Accept: "application/json", Origin: ORIGIN, ...headers } };
  if (token) init.headers.Cookie = token;
  if (body !== undefined) { init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(body); }
  let res, text;
  try {
    res = await fetch(url, init);
    text = await res.text();
  } catch (e) {
    return { status: 0, ok: false, data: null, text: String(e), leak: false };
  }
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  const leak = /SQLSTATE|Connection refused|Stack trace|vendor[\\/]laravel|QueryException/i.test(text);
  return { status: res.status, ok: res.ok, data: json && "data" in json ? json.data : json, json, text: raw ? text : text.slice(0, 300), leak };
}

/** Signs in through the auth service; `token` is the session cookie to send to Laravel. */
async function signIn(email, password) {
  let res, json = null;
  try {
    res = await fetch(`${API}/auth/sign-in/email`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", Origin: ORIGIN }, body: JSON.stringify({ email, password }) });
    json = await res.json().catch(() => null);
  } catch (e) {
    return { status: 0, ok: false, json: null, text: String(e), leak: false };
  }
  const token = res.headers.getSetCookie().map((c) => c.split(";")[0]).find((c) => /session_token=/.test(c)) || null;
  return { status: res.status, ok: res.ok && Boolean(token), token, code: json?.code, json, text: JSON.stringify(json || {}).slice(0, 200), leak: false };
}

function expectOk(section, name, r, extra = true) {
  const ok = r.ok && !r.leak && extra;
  record(section, name, ok, ok ? `${r.status}` : `${r.status} ${r.leak ? "(server error details leaked!) " : ""}${(r.json?.message || r.text || "").toString().slice(0, 160)}`);
  return ok;
}

async function main() {
  console.log(`\nmenuPilot smoke test → ${ORIGIN}\n`);

  // ── 1. Health: Laravel and the auth service, both through the frontend ──
  const health = await call("GET", `${ORIGIN}/up`);
  expectOk("1 health", "GET /up (Laravel)", health);
  const authConfig = await call("GET", "/auth-config");
  expectOk("1 health", "GET /api/auth-config (auth service)", authConfig, typeof authConfig.json?.emailEnabled === "boolean");
  const anon = await call("GET", "/permissions");
  record("1 health", "Protected API without token → 401 (not 500)", anon.status === 401 && !anon.leak, `${anon.status}`);
  if (health.status === 0) { console.log("\nBackend unreachable — stopping."); return; }

  // ── 2 + 3. Database + Authentication ─────────────────────────────────────
  const email = `smoke-${STAMP}@menupilot.test`;
  const reg = await call("POST", "/account/register", { body: { restaurant_name: `Smoke ${STAMP}`, email, password: PASSWORD, password_confirmation: PASSWORD } });
  if (!expectOk("2 database", "Register owner (writes users table)", reg, Boolean(reg.data?.user?.id) && !reg.data?.token)) return;
  let ownerId = reg.data.user.id;
  let ownerEmail = email;
  created.push({ id: ownerId, email });

  let login = await signIn(email, PASSWORD);
  if (login.code === "EMAIL_NOT_VERIFIED") {
    record("3 auth", "New owner must confirm the e-mail first", true, "403 EMAIL_NOT_VERIFIED");
    // Continue with a restaurant the admin creates (already confirmed).
    const admin = ADMIN ? await signIn(ADMIN.email, ADMIN.password) : null;
    if (!admin?.ok) { record("3 auth", "Admin creates a confirmed test restaurant (set SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD)", false, admin ? `${admin.status} ${admin.code || ""}` : "no admin credentials"); return; }
    ownerEmail = `smoke-admin-${STAMP}@menupilot.test`;
    const made = await call("POST", "/admin/restaurants", { token: admin.token, body: { name: `Smoke ${STAMP}`, email: ownerEmail, restaurant_name: `Smoke ${STAMP}`, password: PASSWORD } });
    const madeId = made.data?.restaurant?.id ?? made.data?.id;
    if (!expectOk("2 database", "Admin creates the test restaurant", made, Boolean(madeId))) return;
    created.push({ id: madeId, email: ownerEmail });
    login = await signIn(ownerEmail, PASSWORD);
  }
  if (!expectOk("3 auth", "Sign in (auth service, httpOnly cookie)", login, !login.json?.token)) return;
  const owner = login.token;
  const me1 = await call("GET", "/account/me", { token: owner });
  ownerId = me1.data?.id ?? ownerId;
  expectOk("3 auth", "GET /api/account/me with the cookie (Laravel)", me1, me1.data?.email === ownerEmail);
  expectOk("3 auth", "Owner permissions include close_session", me1, (me1.data?.permissions || []).includes("close_session"));

  // Restaurant setup (geofence, table, menu, staff)
  expectOk("2 database", "Save restaurant location", await call("PATCH", "/me/restaurant", { token: owner, body: { restaurant_name: `Smoke ${STAMP}`, latitude: LAT, longitude: LNG, payment_timing: "after" } }));
  const table = await call("POST", "/tables", { token: owner, body: { label: "Smoke T1", seats: 2 } });
  if (!expectOk("2 database", "Create table", table, Boolean(table.data?.table_code))) return;
  const item = await call("POST", "/menu-items", { token: owner, body: { name: "Smoke Burger", price: 12.5, category: "Smoke" } });
  if (!expectOk("2 database", "Create menu item", item, Boolean(item.data?.id))) return;

  const staffLogin = async (role) => {
    const created = await call("POST", "/staff", { token: owner, body: { name: `Smoke ${role}`, email: `smoke-${role}-${STAMP}@menupilot.test`, role } });
    if (!expectOk("3 auth", `Create ${role} account`, created, Boolean(created.data?.generated_password))) return null;
    const l = await signIn(`smoke-${role}-${STAMP}@menupilot.test`, created.data.generated_password);
    return expectOk("3 auth", `${role} login`, l) ? l.token : null;
  };
  const kitchen = await staffLogin("kitchen");
  const cashier = await staffLogin("cashier");
  if (!kitchen || !cashier) return;

  // ── 4. Customer flow (no login) ──────────────────────────────────────────
  const code = table.data.table_code;
  const menu = await call("GET", `/public/tables/${code}/menu`);
  const menuItems = menu.data?.items || menu.data?.menu || menu.data || [];
  expectOk("4 customer", "QR menu loads", menu, JSON.stringify(menuItems).includes("Smoke Burger"));
  const session = await call("POST", `/public/tables/${code}/sessions`, { body: { name: "Smoke Guest", phone: "0599000000", latitude: LAT, longitude: LNG } });
  if (!expectOk("4 customer", "Open table session (geofence)", session, Boolean(session.data?.access_token))) return;
  const sid = session.data.id;
  const guest = { "X-Session-Token": session.data.access_token };
  const noToken = await call("GET", `/public/sessions/${sid}`);
  record("4 customer", "Session is private without its token → 403", noToken.status === 403, `${noToken.status}`);
  const order = await call("POST", `/public/sessions/${sid}/orders`, { headers: guest, body: { items: [{ menuItemId: item.data.id, quantity: 2, note: "smoke test" }] } });
  if (!expectOk("4 customer", "Submit order", order, Boolean(order.data?.id))) return;
  const orderId = order.data.id;
  const track = await call("GET", `/public/sessions/${sid}/orders`, { headers: guest });
  expectOk("4 customer", "Customer sees the order", track, JSON.stringify(track.data || []).includes(String(orderId)));

  // ── 5. Kitchen ────────────────────────────────────────────────────────────
  const queue = await call("GET", "/kitchen/orders", { token: kitchen });
  expectOk("5 kitchen", "GET /kitchen/orders (no 403/500)", queue, (queue.data || []).some((o) => o.id === orderId));
  for (const status of ["preparing", "ready", "served"]) {
    expectOk("5 kitchen", `Order → ${status}`, await call("PATCH", `/kitchen/orders/${orderId}/status`, { token: kitchen, body: { status } }));
  }

  // ── 6. Cashier ────────────────────────────────────────────────────────────
  const bill = await call("GET", `/sessions/${sid}/bill`, { token: cashier });
  const billItems = bill.data?.items || [];
  expectOk("6 cashier", "Bill shows the real order (not a template)", bill,
    billItems.some((i) => i.name === "Smoke Burger" && Number(i.quantity) === 2) && Number(bill.data?.total) === 25);
  const pay = await call("POST", `/sessions/${sid}/payment`, { token: cashier, body: { method: "cash", close: false } });
  expectOk("6 cashier", "Record payment", pay, pay.data?.status === "verified");
  const close = await call("POST", `/sessions/${sid}/close`, { token: cashier });
  expectOk("6 cashier", "Close session", close, close.data?.status === "closed");
  const tables = await call("GET", "/tables", { token: owner });
  expectOk("6 cashier", "Table is available again", tables, (tables.data || []).some((t) => t.table_code === code && t.status === "available"));

  // ── 7. Session persistence + logout ──────────────────────────────────────
  const me2 = await call("GET", "/account/me", { token: owner });
  const me3 = await call("GET", "/account/me", { token: owner });
  expectOk("7 session", "Session still valid after many requests (no silent logout)", me3, me2.ok && me2.data?.id === ownerId && me3.data?.id === ownerId);
  expectOk("7 session", "Sign out", await call("POST", "/auth/sign-out", { token: owner, body: {} }));
  const after = await call("GET", "/account/me", { token: owner });
  record("7 session", "Session rejected after sign-out → 401", after.status === 401, `${after.status}`);
}

/** Optional: deletes the temporary restaurants (needs admin credentials). */
async function cleanup() {
  if (!ADMIN) {
    console.log(`\nℹ️  Temporary restaurants left in place: ${created.map((c) => c.email).join(", ")} (delete them from the admin panel).`);
    return;
  }
  const admin = await signIn(ADMIN.email, ADMIN.password);
  if (!admin.ok) { record("cleanup", "Admin sign-in for cleanup", false, `${admin.status} ${admin.code || ""}`); return; }
  for (const { id, email } of created) {
    const del = await call("DELETE", `/admin/restaurants/${id}`, { token: admin.token, body: { confirm_email: email } });
    record("cleanup", `Delete temporary restaurant ${email}`, del.ok, `${del.status}`);
  }
}

main().then(() => (created.length ? cleanup() : null)).finally(() => {
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${failed ? "🔴 NO-GO" : "🟢 GO"} — ${passed}/${results.length} checks passed\n`);
  process.exit(failed ? 1 : 0);
});
