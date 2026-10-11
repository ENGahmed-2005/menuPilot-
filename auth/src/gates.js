/* gates.js — menuPilot's own sign-in rules around Better Auth, on Laravel's tables.
   - lockout: 5 wrong passwords lock the account for 15 minutes (users.login_*),
     the same rule Laravel's old login had — the main guard against guessing;
   - status: a disabled account, a disabled restaurant, a staff member who
     was removed or changed role, or a demo account never gets a session;
   - passwords: users.password stays canonical. The credential account is
     refreshed from it before a password sign-in, and written back to it
     after a change or a reset (with the old Laravel token revoked). */
import { sql } from "kysely";
import { APIError } from "better-auth/api";
import { db } from "./db.js";

export const LOCK_AFTER = 5;
export const LOCK_MINUTES = 15;

const LOCKED_MESSAGE = "تم إيقاف الدخول مؤقتًا بعد عدة محاولات خاطئة. حاول مجددًا بعد 15 دقيقة، أو استخدم «نسيت كلمة المرور».";

export const accountLocked = () => APIError.from("TOO_MANY_REQUESTS", { code: "ACCOUNT_LOCKED", message: LOCKED_MESSAGE });
const disabled = (message) => APIError.from("FORBIDDEN", { code: "ACCOUNT_DISABLED", message });

const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : "");

export async function findUserByEmail(email) {
  const value = normalizeEmail(email);
  if (!value) return null;
  return (await db.selectFrom("users").select(["id", "password", "login_failed_attempts", "login_locked_until", "is_demo", "is_active"])
    .where("email", "=", value).executeTakeFirst()) ?? null;
}

/* ---- lockout -------------------------------------------------------------- */
export const isLocked = (user) => Boolean(user?.login_locked_until && new Date(user.login_locked_until) > new Date());

/** One more wrong password. True when this one locks the account. */
export async function recordFailure(userId) {
  await db.updateTable("users").set({ login_failed_attempts: sql`LEAST(login_failed_attempts + 1, 255)` }).where("id", "=", userId).execute();
  const row = await db.selectFrom("users").select("login_failed_attempts").where("id", "=", userId).executeTakeFirst();
  if (!row || row.login_failed_attempts < LOCK_AFTER) return false;
  await db.updateTable("users")
    .set({ login_failed_attempts: 0, login_locked_until: new Date(Date.now() + LOCK_MINUTES * 60_000) })
    .where("id", "=", userId).execute();
  return true;
}

export async function clearFailures(userId) {
  await db.updateTable("users").set({ login_failed_attempts: 0, login_locked_until: null })
    .where("id", "=", userId)
    .where((eb) => eb.or([eb("login_failed_attempts", ">", 0), eb("login_locked_until", "is not", null)]))
    .execute();
}

/* ---- who may hold a session ---------------------------------------------- */
/** Throws ACCOUNT_DISABLED (403) when this user must not be signed in. Mirrors App\Http\Middleware\ApiAuth. */
export async function assertMaySignIn(userId) {
  const user = await db.selectFrom("users").select(["id", "role", "is_active", "is_demo", "two_factor_enabled"]).where("id", "=", Number(userId)).executeTakeFirst();
  if (!user) throw disabled("هذا الحساب غير موجود.");
  if (user.is_demo) throw disabled("حسابات التجربة تُفتح من زر «جرّب menuPilot» فقط.");
  if (!user.is_active) throw disabled("تم تعطيل هذا الحساب. تواصل مع إدارة المنصة.");
  if (user.role === "owner" || user.role === "admin") return user;

  const staff = await db.selectFrom("staff").select(["user_id", "active", "role"]).where("account_user_id", "=", user.id).executeTakeFirst();
  if (!staff || !staff.active || staff.role !== user.role) {
    throw disabled("حساب الموظف هذا موقوف أو غير مرتبط بمطعم. تواصل مع صاحب المطعم.");
  }
  const restaurant = await db.selectFrom("users").select("is_active").where("id", "=", staff.user_id).executeTakeFirst();
  if (!restaurant?.is_active) throw disabled("حساب هذا المطعم موقوف. تواصل مع إدارة المنصة.");
  return user;
}

/* ---- passwords: users.password <-> credential account ------------------- */
const credentialWhere = (userId) => (eb) => eb.and([eb("provider_id", "=", "credential"), eb("account_id", "=", String(userId))]);

/** Before a password sign-in: the credential account gets the hash Laravel holds. */
export async function syncCredentialFromUser(user) {
  if (!user?.password) return;
  const account = await db.selectFrom("auth_accounts").select(["id", "password", "user_id"]).where(credentialWhere(user.id)).executeTakeFirst();
  if (account) {
    if (account.password !== user.password || Number(account.user_id) !== Number(user.id)) {
      await db.updateTable("auth_accounts").set({ password: user.password, user_id: user.id, updated_at: new Date() }).where("id", "=", account.id).execute();
    }
    return;
  }
  const now = new Date();
  await db.insertInto("auth_accounts")
    .values({ id: randomId(), user_id: user.id, account_id: String(user.id), provider_id: "credential", password: user.password, created_at: now, updated_at: now })
    .execute()
    .catch((error) => { if (error?.code !== "ER_DUP_ENTRY") throw error; }); // a parallel sign-in made it
}

/** After a change or reset here: Laravel gets the new hash; its old token and lockout go. */
export async function syncUserFromCredential(userId) {
  const account = await db.selectFrom("auth_accounts").select("password").where(credentialWhere(userId)).executeTakeFirst();
  if (!account?.password) return;
  await db.updateTable("users")
    .set({ password: account.password, api_token: null, remember_token: null, login_failed_attempts: 0, login_locked_until: null, updated_at: new Date() })
    .where("id", "=", Number(userId)).execute();
}

/** Sends nothing to accounts that can't use it (demo, disabled). */
export async function mayReceiveMail(userId) {
  const user = await db.selectFrom("users").select(["is_active", "is_demo"]).where("id", "=", Number(userId)).executeTakeFirst();
  return Boolean(user && user.is_active && !user.is_demo);
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
/** The same shape as Better Auth's ids (32 alphanumerics). */
export function randomId(length = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
  let id = "";
  for (const byte of bytes) {
    if (byte < 248) id += ALPHABET[byte % 62]; // 248 = 4 × 62: no modulo bias
    if (id.length === length) break;
  }
  return id.length === length ? id : randomId(length);
}
