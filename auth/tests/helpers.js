/* helpers.js — the auth service in-process against a real MySQL/MariaDB test database.
   The database must carry Laravel's migrations (php artisan migrate) and its name
   must contain "test": every test empties the users and auth tables. */
import { sql } from "kysely";

process.env.BETTER_AUTH_SECRET ||= "test-secret-test-secret-test-secret-0123456789";
process.env.MAIL_TRANSPORT = "memory";
process.env.AUTH_PWNED_CHECK = "false";

const { app, waitForSchema } = await import("../src/server.js");
await waitForSchema();
const { checkSchema } = await import("../src/auth.js");
const { db } = await import("../src/db.js");
const { sentMail } = await import("../src/mail.js");
const { hashPassword } = await import("../src/passwords.js");
export { app, checkSchema, db, sentMail, hashPassword, sql };

export const PASSWORD = "Secret#123";
const FRONTEND = "http://localhost:5173";

export async function reset() {
  const { rows } = await sql`select database() as name`.execute(db);
  if (!/test/i.test(rows[0].name)) throw new Error(`Refusing to empty "${rows[0].name}": use a database whose name contains "test".`);
  await sql`SET FOREIGN_KEY_CHECKS = 0`.execute(db);
  for (const table of ["google_registrations", "auth_rate_limits", "auth_two_factors", "auth_verifications", "auth_accounts", "auth_sessions", "staff", "users"]) {
    await sql`DELETE FROM ${sql.table(table)}`.execute(db);
  }
  await sql`SET FOREIGN_KEY_CHECKS = 1`.execute(db);
  sentMail.length = 0;
}

/** A user the way Laravel writes one ("$2y$" hash in users.password, no credential row yet). */
export async function makeUser(fields = {}) {
  const now = new Date();
  const email = fields.email ?? `user${Math.random().toString(36).slice(2, 10)}@menupilot.test`;
  const result = await db.insertInto("users").values({
    name: "Zaytoona", email, password: await hashPassword(fields.password ?? PASSWORD), role: "owner",
    email_verified: 1, is_active: 1, created_at: now, updated_at: now,
    ...Object.fromEntries(Object.entries(fields).filter(([k]) => k !== "password")),
  }).executeTakeFirst();
  return { id: Number(result.insertId), email };
}

export async function makeStaff(ownerId, role = "cashier", staffFields = {}) {
  const user = await makeUser({ role });
  const now = new Date();
  await db.insertInto("staff").values({ user_id: ownerId, account_user_id: user.id, name: "Cashier", email: user.email, role, active: 1, created_at: now, updated_at: now, ...staffFields }).execute();
  return user;
}

/** A browser: keeps cookies between calls, talks through the frontend origin. */
export function browser({ ip = "203.0.113.10" } = {}) {
  const jar = new Map();
  const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  return {
    jar,
    async call(path, { method = "GET", body, headers = {} } = {}) {
      const res = await app.request(`http://auth.internal${path}`, {
        method,
        headers: {
          origin: FRONTEND, "x-forwarded-host": "localhost:5173", "x-forwarded-proto": "http",
          ...(ip ? { "x-forwarded-for": ip } : {}),
          ...(body !== undefined ? { "content-type": "application/json" } : {}),
          ...(jar.size ? { cookie: cookieHeader() } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      for (const line of res.headers.getSetCookie()) {
        const [pair, ...attrs] = line.split(";");
        const eq = pair.indexOf("=");
        const name = pair.slice(0, eq).trim();
        const value = pair.slice(eq + 1).trim();
        if (!value || attrs.some((a) => /max-age=0\b/i.test(a.trim()))) jar.delete(name);
        else jar.set(name, value);
      }
      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = text; }
      return { status: res.status, json, headers: res.headers };
    },
    signIn(email, password = PASSWORD) {
      return this.call("/api/auth/sign-in/email", { method: "POST", body: { email, password } });
    },
    sessionToken() {
      const raw = jar.get("menupilot.session_token");
      return raw ? decodeURIComponent(raw).split(".")[0] : null;
    },
  };
}

export const sessionsOf = (userId) => db.selectFrom("auth_sessions").selectAll().where("user_id", "=", userId).execute();
export const userRow = (userId) => db.selectFrom("users").selectAll().where("id", "=", userId).executeTakeFirstOrThrow();
