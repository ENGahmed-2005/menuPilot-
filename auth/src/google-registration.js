import { createHash, randomBytes } from "node:crypto";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { db } from "./db.js";

const digest = (token) => createHash("sha256").update(token).digest("hex");
const cookie = (ctx) => ctx.context.createAuthCookie("google_registration", { maxAge: 600 });

// This gate runs on server-derived OAuth profile data, before any user insert.
export async function googleRegistrationGate({ user, source }, ctx) {
  if (source.action !== "create-user") return;
  const profile = source.oauth?.profile;
  if (source.method !== "oauth" || source.oauth?.providerId !== "google" || !ctx.path.startsWith("/callback/")
    || user.emailVerified !== true || profile?.email_verified !== true || typeof profile.sub !== "string" || !profile.sub
    || typeof user.email !== "string" || profile.email?.toLowerCase() !== user.email.toLowerCase()) {
    return { error: "email_not_verified" };
  }
  const token = randomBytes(32).toString("hex");
  await db.deleteFrom("google_registrations").where("expires_at", "<=", new Date()).execute();
  await db.insertInto("google_registrations").values({
    token_hash: digest(token), email: user.email.toLowerCase(), subject: profile.sub,
    expires_at: new Date(Date.now() + 600_000), created_at: new Date(),
  }).execute();
  const c = cookie(ctx);
  await ctx.setSignedCookie(c.name, token, ctx.context.secret, c.attributes);
  return { error: "GOOGLE_REGISTRATION_REQUIRED" };
}

async function pending(ctx) {
  const c = cookie(ctx);
  const token = await ctx.getSignedCookie(c.name, ctx.context.secret);
  const row = typeof token === "string" && await db.selectFrom("google_registrations").selectAll()
    .where("token_hash", "=", digest(token)).where("expires_at", ">", new Date()).executeTakeFirst();
  if (!row) throw APIError.from("UNAUTHORIZED", { code: "GOOGLE_REGISTRATION_EXPIRED", message: "Start Google sign-in again." });
  return row;
}

export const googleRegistration = () => ({
  id: "google-registration",
  endpoints: {
    googleRegistrationInfo: createAuthEndpoint("/google-registration", { method: "GET" }, async (ctx) => {
      ctx.setHeader("Cache-Control", "no-store");
      const row = await pending(ctx);
      return ctx.json({ email: row.email, csrf: row.token_hash });
    }),
    finishGoogleRegistration: createAuthEndpoint("/google-registration/session", { method: "POST", requireHeaders: true, metadata: { noStore: true } }, async (ctx) => {
      const row = await pending(ctx);
      if (!row.user_id) throw APIError.from("BAD_REQUEST", { code: "REGISTRATION_INCOMPLETE", message: "Complete restaurant registration first." });
      // Use Better Auth's normal session hooks, including disabled/demo/2FA gates.
      const linked = await db.selectFrom("auth_accounts").select("user_id").where("provider_id", "=", "google")
        .where("account_id", "=", row.subject).executeTakeFirst();
      if (String(linked?.user_id) !== String(row.user_id)) throw APIError.from("FORBIDDEN", { message: "Account binding changed." });
      const user = await ctx.context.internalAdapter.findUserById(String(row.user_id));
      const session = await ctx.context.internalAdapter.createSession(String(row.user_id));
      // Only the request that consumes this proof may publish its session cookie.
      const consumed = await db.deleteFrom("google_registrations")
        .where("token_hash", "=", row.token_hash).where("expires_at", ">", new Date()).executeTakeFirst();
      if (Number(consumed.numDeletedRows) !== 1) {
        await ctx.context.internalAdapter.deleteSession(session.token);
        throw APIError.from("UNAUTHORIZED", { code: "GOOGLE_REGISTRATION_EXPIRED", message: "Start Google sign-in again." });
      }
      await setSessionCookie(ctx, { user, session });
      const c = cookie(ctx);
      ctx.setCookie(c.name, "", { ...c.attributes, maxAge: 0 });
      return ctx.json({ status: true });
    }),
  },
});
