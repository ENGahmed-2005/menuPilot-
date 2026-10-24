/* Sensitive Google account operations. Better Auth owns OAuth, credentials and
   TOTP; this plugin binds their proof to one operation and the original session. */
import { createHash, randomBytes } from "node:crypto";
import { APIError, addOAuthServerContext, createAuthEndpoint, createAuthMiddleware, getAuthoritativeSessionFromCtx, getOAuthState, sensitiveSessionMiddleware } from "better-auth/api";
import { db } from "./db.js";
import { accountLocked, assertMaySignIn, clearFailures, findUserByEmail, isLocked, recordFailure, syncCredentialFromUser } from "./gates.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const cookie = (ctx) => ctx.context.createAuthCookie("google_operation", { maxAge: 300 });
const fail = (code, status = "FORBIDDEN") => APIError.from(status, { code, message: code });
const reject = () => { throw fail("GOOGLE_REAUTH_REQUIRED"); };
async function securityStamp(userId) {
  const user = await db.selectFrom("users").select(["password", "two_factor_enabled"]).where("id", "=", Number(userId)).executeTakeFirstOrThrow();
  return hash(`${user.password}|${Number(user.two_factor_enabled)}`);
}

// Historical provider tokens were stored by the server's OAuth exchange. This
// fallback is display-only; authorization always uses the live verified sub.
function displayedEmail(account) {
  if (account.google_email) return account.google_email;
  try {
    const claims = JSON.parse(Buffer.from(account.id_token.split(".")[1], "base64url").toString());
    if (claims.sub === account.account_id && claims.email_verified === true && typeof claims.email === "string") return claims.email;
  } catch { /* old links may not have retained an ID token */ }
  return null;
}

async function current(ctx) {
  const session = await getAuthoritativeSessionFromCtx(ctx);
  if (!session?.session) throw fail("SESSION_EXPIRED", "UNAUTHORIZED");
  await assertMaySignIn(session.user.id);
  return session;
}

async function proofFromCookie(ctx, session) {
  const token = await ctx.getSignedCookie(cookie(ctx).name, ctx.context.secret);
  const proof = typeof token === "string" && await db.selectFrom("auth_google_proofs").selectAll()
    .where("id", "=", hash(token)).where("expires_at", ">", new Date()).executeTakeFirst();
  if (!proof || String(proof.user_id) !== session.user.id || proof.session_id !== session.session.id || proof.security_hash !== await securityStamp(session.user.id)) reject();
  return proof;
}

async function mint(ctx, session, fields) {
  const token = randomBytes(32).toString("hex");
  await db.deleteFrom("auth_google_proofs").where("expires_at", "<=", new Date()).execute();
  // A new confirmation invalidates previous confirmations on this session.
  await db.deleteFrom("auth_google_proofs").where("session_id", "=", session.session.id).execute();
  await db.insertInto("auth_google_proofs").values({
    id: hash(token), user_id: Number(session.user.id), session_id: session.session.id,
    security_hash: await securityStamp(session.user.id),
    expires_at: new Date(Date.now() + 300_000), ...fields,
  }).execute();
  const c = cookie(ctx);
  await ctx.setSignedCookie(c.name, token, ctx.context.secret, c.attributes);
}

export async function beforeGoogleLink(ctx) {
  const session = await current(ctx);
  if (ctx.body?.provider !== "google" || ctx.body?.idToken) reject();
  const proof = await proofFromCookie(ctx, session);
  if (!((proof.stage === "verified" && proof.action === "link") || proof.stage === "reauth-ready")) reject();
  const result = await db.updateTable("auth_google_proofs").set({ stage: "started" })
    .where("id", "=", proof.id).where("stage", "=", proof.stage).where("expires_at", ">", new Date()).executeTakeFirst();
  if (Number(result.numUpdatedRows) !== 1) reject();
  await addOAuthServerContext({ googleOperation: { id: proof.id, mode: proof.stage === "reauth-ready" ? "reauth" : "link" } });
  // Keep both outcomes inside the Security page, including Google-only reauth.
  ctx.body.callbackURL = "/account/security?linked=google";
  ctx.body.errorCallbackURL = "/account/security";
}

export async function validateGoogleLink({ user, source }, ctx) {
  if (source.method !== "oauth" || source.oauth?.providerId !== "google") return;
  const profile = source.oauth.profile;
  if (source.action !== "link-account") {
    if (profile?.email_verified === true && typeof profile.email === "string") ctx.context.googleProfileEmail = profile.email.toLowerCase();
    return;
  }
  try {
    const state = await getOAuthState();
    const operation = state?.serverContext?.googleOperation;
    const session = await current(ctx);
    if (!state?.link || !operation || String(state.link.userId) !== session.user.id || user.id !== session.user.id) reject();
    const proof = await db.selectFrom("auth_google_proofs").selectAll().where("id", "=", operation.id)
      .where("stage", "=", "started").where("expires_at", ">", new Date()).executeTakeFirst();
    if (!proof || String(proof.user_id) !== session.user.id || proof.session_id !== session.session.id || proof.security_hash !== await securityStamp(session.user.id)) reject();
    // Consume before identity checks too: cancellation, conflicts and failure need a new proof.
    const consumed = await db.deleteFrom("auth_google_proofs").where("id", "=", proof.id).where("stage", "=", "started").executeTakeFirst();
    if (Number(consumed.numDeletedRows) !== 1) reject();
    if (profile?.email_verified !== true || user.emailVerified !== true || typeof profile.sub !== "string" || !profile.sub || typeof profile.email !== "string") throw fail("email_not_verified");
    if (operation.mode === "reauth") {
      const binding = await db.selectFrom("auth_accounts").select("id").where("provider_id", "=", "google")
        .where("account_id", "=", profile.sub).where("user_id", "=", Number(session.user.id)).executeTakeFirst();
      if (!binding || profile.sub !== proof.google_subject) throw fail("GOOGLE_WRONG_REAUTH_ACCOUNT");
      await db.updateTable("auth_accounts").set({ google_email: profile.email.toLowerCase() }).where("id", "=", binding.id).execute();
      await mint(ctx, session, { action: proof.action, target_id: proof.target_id, stage: "verified" });
      return { error: "GOOGLE_REAUTHENTICATED" };
    }
    if (operation.mode !== "link" || proof.action !== "link") reject();
    const owner = await db.selectFrom("auth_accounts").select("user_id").where("provider_id", "=", "google").where("account_id", "=", profile.sub).executeTakeFirst();
    if (owner && String(owner.user_id) !== session.user.id) throw fail("account_already_linked_to_different_user");
    const emailOwner = await findUserByEmail(profile.email);
    if (emailOwner && String(emailOwner.id) !== session.user.id) throw fail("GOOGLE_EMAIL_CONFLICT");
    ctx.context.googleProfileEmail = profile.email.toLowerCase();
  } catch (error) {
    if (error?.body?.code) return { error: error.body.code };
    return { error: "GOOGLE_REAUTH_REQUIRED" };
  }
}

export function googleAccountData(account, ctx) {
  if (account.providerId === "google" && ctx?.context.googleProfileEmail) {
    return { data: { ...account, googleEmail: ctx.context.googleProfileEmail } };
  }
}

export const googleLinks = (getAuth) => ({
  id: "google-links",
  endpoints: {
    googleLinkStatus: createAuthEndpoint("/google-link/status", { method: "GET", use: [sensitiveSessionMiddleware], metadata: { noStore: true } }, async (ctx) => {
      const session = await current(ctx);
      const accounts = await db.selectFrom("auth_accounts").select(["id", "provider_id", "password", "google_email", "id_token", "account_id"])
        .where("user_id", "=", Number(session.user.id)).execute();
      let proof;
      try { proof = await proofFromCookie(ctx, session); } catch { /* no pending confirmation */ }
      return ctx.json({
        hasPassword: accounts.some((a) => a.provider_id === "credential" && a.password),
        accounts: accounts.filter((a) => a.provider_id === "google").map((a) => ({ id: a.id, email: displayedEmail(a) })),
        verifiedAction: proof?.stage === "verified" ? proof.action : null,
      });
    }),
    verifyGoogleOperation: createAuthEndpoint("/google-link/verify", { method: "POST", use: [sensitiveSessionMiddleware], requireHeaders: true, metadata: { noStore: true } }, async (ctx) => {
      const session = await current(ctx);
      await db.deleteFrom("auth_google_proofs").where("session_id", "=", session.session.id).execute();
      const action = ctx.body?.action;
      if (!["link", "unlink"].includes(action)) reject();
      const accounts = await db.selectFrom("auth_accounts").selectAll().where("user_id", "=", Number(session.user.id)).orderBy("id").execute();
      const target = action === "unlink" ? accounts.find((a) => a.id === ctx.body?.accountId && a.provider_id === "google") : null;
      if (action === "unlink" && !target) throw fail("ACCOUNT_NOT_FOUND");
      const local = await findUserByEmail(session.user.email);
      if (isLocked(local)) throw accountLocked();
      const hasPassword = accounts.some((a) => a.provider_id === "credential" && a.password);
      try {
        if (hasPassword) {
          await syncCredentialFromUser(local);
          await getAuth().api.verifyPassword({ headers: ctx.headers, body: { password: typeof ctx.body?.password === "string" ? ctx.body.password : "" } });
        }
        if (session.user.twoFactorEnabled) {
          await getAuth().api.verifyTOTP({ headers: ctx.headers, body: { code: String(ctx.body?.code || "").replace(/\s/g, "") } });
        }
      } catch (error) {
        if (await recordFailure(session.user.id)) throw accountLocked();
        throw error;
      }
      const google = accounts.find((a) => a.provider_id === "google");
      if (!hasPassword && !google) reject();
      await clearFailures(session.user.id);
      await mint(ctx, session, { action, target_id: target?.id ?? null, stage: hasPassword ? "verified" : "reauth-ready", google_subject: !hasPassword ? google.account_id : null });
      return ctx.json({ reauthGoogle: !hasPassword });
    }),
    unlinkGoogleAccount: createAuthEndpoint("/google-link/unlink", { method: "POST", use: [sensitiveSessionMiddleware], requireHeaders: true, metadata: { noStore: true } }, async (ctx) => {
      const session = await current(ctx);
      const proof = await proofFromCookie(ctx, session);
      if (proof.stage !== "verified" || proof.action !== "unlink") reject();
      const consumed = await db.deleteFrom("auth_google_proofs").where("id", "=", proof.id).where("stage", "=", "verified").executeTakeFirst();
      if (Number(consumed.numDeletedRows) !== 1) reject();
      // Unlike the native unlink endpoint, serialize concurrent removals and count usable methods.
      await db.transaction().execute(async (trx) => {
        const owner = await trx.selectFrom("users").select(["id", "two_factor_enabled", "email_verified"]).where("id", "=", Number(session.user.id)).forUpdate().executeTakeFirstOrThrow();
        const accounts = await trx.selectFrom("auth_accounts").selectAll().where("user_id", "=", Number(session.user.id)).execute();
        const target = accounts.find((a) => a.id === proof.target_id && a.provider_id === "google");
        if (!target) throw fail("ACCOUNT_NOT_FOUND");
        const remaining = accounts.filter((a) => a.id !== target.id);
        const password = remaining.some((a) => a.provider_id === "credential" && a.password) && (owner.email_verified || !ctx.context.options.emailAndPassword?.requireEmailVerification);
        const google = remaining.some((a) => a.provider_id === "google") && !owner.two_factor_enabled;
        if (!password && !google) throw fail("FAILED_TO_UNLINK_LAST_ACCOUNT", "BAD_REQUEST");
        await trx.deleteFrom("auth_accounts").where("id", "=", target.id).execute();
      });
      return ctx.json({ status: true });
    }),
  },
  hooks: { after: [{
    matcher: (ctx) => ctx.path.startsWith("/callback/"),
    handler: createAuthMiddleware(async () => {
      const operation = (await getOAuthState())?.serverContext?.googleOperation;
      if (operation?.id) await db.deleteFrom("auth_google_proofs").where("id", "=", operation.id).execute();
    }),
  }] },
});
