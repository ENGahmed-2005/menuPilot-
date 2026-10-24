import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import * as OTPAuth from "otpauth";

process.env.GOOGLE_CLIENT_ID = "test-client.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
const { browser, db, hashPassword, makeUser, PASSWORD, reset, sessionsOf, userRow } = await import("./helpers.js");
beforeEach(reset);
after(() => db.destroy());
let identity;
const realFetch = globalThis.fetch;
const b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith("https://oauth2.googleapis.com/token")) return realFetch(input, init);
  return new Response(JSON.stringify({ access_token: "test-access", id_token: `${b64({ alg: "RS256" })}.${b64({ iss: "https://accounts.google.com", aud: process.env.GOOGLE_CLIENT_ID, sub: identity.sub, email: identity.email, email_verified: identity.verified ?? true, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })}.sig`, expires_in: 3600 }), { headers: { "content-type": "application/json" } });
};
const post = (b, path, body = {}) => b.call(`/api/auth/${path}`, { method: "POST", body });
const verify = (b, body = {}) => post(b, "google-link/verify", { action: "link", password: PASSWORD, ...body });
async function start(b) {
  const res = await post(b, "link-social", { provider: "google", callbackURL: "/account/security", errorCallbackURL: "/account/security" });
  assert.equal(res.status, 200, JSON.stringify(res.json));
  return new URL(res.json.url).searchParams.get("state");
}
async function callback(b, state, person, error) {
  identity = person;
  return b.call(`/api/auth/callback/google?state=${encodeURIComponent(state)}&${error ? `error=${error}` : "code=test"}`);
}
async function bind(user, sub = "linked", email = "linked@example.test") {
  const id = `account-${sub}`;
  await db.insertInto("auth_accounts").values({ id, user_id: user.id, provider_id: "google", account_id: sub, google_email: email }).execute();
  return id;
}
async function ownerBrowser(fields) {
  const user = await makeUser(fields);
  const b = browser();
  assert.equal((await b.signIn(user.email)).status, 200);
  return { user, b };
}
const accounts = (id) => db.selectFrom("auth_accounts").selectAll().where("user_id", "=", id).where("provider_id", "=", "google").execute();

describe("Google account security", () => {
  it("does not link verified matching emails implicitly or accept cross-site confirmations", async () => {
    const { user, b } = await ownerBrowser();
    const fresh = browser();
    const signIn = await post(fresh, "sign-in/social", { provider: "google", callbackURL: "/login", errorCallbackURL: "/login" });
    const res = await callback(fresh, new URL(signIn.json.url).searchParams.get("state"), { sub: "implicit", email: user.email });
    assert.match(res.headers.get("location"), /account_not_linked/);
    assert.equal((await accounts(user.id)).length, 0);
    assert.equal((await b.call("/api/auth/google-link/verify", { method: "POST", body: { action: "link", password: PASSWORD }, headers: { origin: "https://evil.example" } })).status, 403);
  });
  it("requires new proof even for fresh sessions, then links a different email without changing the primary", async () => {
    const { user, b } = await ownerBrowser();
    assert.equal((await post(b, "link-social", { provider: "google" })).json.code, "GOOGLE_REAUTH_REQUIRED");
    assert.equal((await verify(b, { password: "wrong" })).json.code, "INVALID_PASSWORD");
    assert.equal((await verify(b)).status, 200);
    const state = await start(b);
    const res = await callback(b, state, { sub: "different", email: "different@gmail.test" });
    assert.equal(res.headers.get("location"), "/account/security?linked=google");
    assert.equal((await userRow(user.id)).email, user.email);
    assert.equal((await accounts(user.id))[0].account_id, "different");
    assert.equal((await accounts(user.id))[0].google_email, "different@gmail.test");
    assert.equal((await b.call("/api/auth/google-link/status")).json.accounts[0].email, "different@gmail.test");
    const other = browser();
    const login = await post(other, "sign-in/social", { provider: "google", callbackURL: "/login", errorCallbackURL: "/login" });
    const back = await callback(other, new URL(login.json.url).searchParams.get("state"), { sub: "different", email: "different@gmail.test" });
    assert.equal(back.headers.get("location"), "/login");
    assert.equal((await other.call("/api/auth/get-session")).json.user.id, String(user.id));
  });

  it("refuses identity ownership and email conflicts without transferring or merging", async () => {
    const { user, b } = await ownerBrowser();
    const other = await makeUser();
    await bind(other, "taken", "taken@gmail.test");
    await verify(b);
    let res = await callback(b, await start(b), { sub: "taken", email: "taken@gmail.test" });
    assert.match(res.headers.get("location"), /account_already_linked_to_different_user/);
    await verify(b);
    res = await callback(b, await start(b), { sub: "unused", email: other.email });
    assert.match(res.headers.get("location"), /GOOGLE_EMAIL_CONFLICT/);
    assert.equal((await accounts(user.id)).length, 0);
    assert.equal((await accounts(other.id)).length, 1);
  });

  it("requires TOTP as well as password when enabled", async () => {
    const { b } = await ownerBrowser();
    const enabled = await post(b, "two-factor/enable", { password: PASSWORD });
    const code = OTPAuth.URI.parse(enabled.json.totpURI).generate();
    assert.equal((await post(b, "two-factor/verify-totp", { code })).status, 200);
    assert.equal((await verify(b)).status, 401);
    assert.equal((await verify(b, { code })).status, 200);
    assert.equal((await callback(b, await start(b), { sub: "mfa", email: "mfa@gmail.test" })).headers.get("location"), "/account/security?linked=google");
  });

  it("rejects expired sessions and switched users on callback", async () => {
    for (const switched of [false, true]) {
      const { user, b } = await ownerBrowser();
      await verify(b);
      const state = await start(b);
      if (switched) {
        const other = await makeUser();
        await b.signIn(other.email);
      } else await db.deleteFrom("auth_sessions").where("user_id", "=", user.id).execute();
      const res = await callback(b, state, { sub: `invalid-${switched}`, email: "unused@gmail.test" });
      assert.match(res.headers.get("location"), /SESSION_EXPIRED|GOOGLE_REAUTH_REQUIRED/);
      assert.equal((await accounts(user.id)).length, 0);
    }
  });

  it("rejects expired or replayed proofs, state replay and cancellation", async () => {
    const { b, user } = await ownerBrowser();
    await verify(b);
    await db.updateTable("auth_google_proofs").set({ expires_at: new Date(0) }).execute();
    assert.equal((await post(b, "link-social", { provider: "google" })).json.code, "GOOGLE_REAUTH_REQUIRED");
    await verify(b);
    const proofCookie = b.jar.get("menupilot.google_operation");
    const state = await start(b);
    assert.equal((await post(b, "link-social", { provider: "google" })).json.code, "GOOGLE_REAUTH_REQUIRED");
    assert.match((await callback(b, state, null, "access_denied")).headers.get("location"), /access_denied/);
    b.jar.set("menupilot.google_operation", proofCookie);
    assert.equal((await post(b, "link-social", { provider: "google" })).json.code, "GOOGLE_REAUTH_REQUIRED");
    assert.match((await callback(b, state, { sub: "replay", email: "replay@gmail.test" })).headers.get("location"), /error=/);
    assert.equal((await accounts(user.id)).length, 0);
  });

  it("reauthenticates Google-only owners with their linked subject and refuses removing the last method", async () => {
    const user = await makeUser();
    const id = await bind(user);
    // A real Google-only session, with no credential account.
    const b = browser();
    let res = await post(b, "sign-in/social", { provider: "google", callbackURL: "/login" });
    await callback(b, new URL(res.json.url).searchParams.get("state"), { sub: "linked", email: "linked@example.test" });
    assert.equal((await b.call("/api/auth/google-link/status")).json.hasPassword, false);
    assert.equal((await verify(b, { action: "unlink", accountId: id })).json.reauthGoogle, true);
    res = await callback(b, await start(b), { sub: "wrong", email: "wrong@example.test" });
    assert.match(res.headers.get("location"), /GOOGLE_WRONG_REAUTH_ACCOUNT/);
    await verify(b, { action: "unlink", accountId: id });
    res = await callback(b, await start(b), { sub: "linked", email: "linked@example.test" });
    assert.match(res.headers.get("location"), /GOOGLE_REAUTHENTICATED/);
    assert.equal((await post(b, "google-link/unlink")).json.code, "FAILED_TO_UNLINK_LAST_ACCOUNT");
    assert.equal((await accounts(user.id)).length, 1);
    assert.equal((await db.selectFrom("auth_accounts").selectAll().where("provider_id", "=", "credential").execute()).length, 0);
  });

  it("unlinks only the verified target, keeps password login and refuses proof replay", async () => {
    const { user, b } = await ownerBrowser();
    const id = await bind(user);
    assert.equal((await post(b, "unlink-account", { accountId: id })).json.code, "GOOGLE_REAUTH_REQUIRED");
    await verify(b, { action: "unlink", accountId: id });
    assert.equal((await post(b, "google-link/unlink")).status, 200);
    assert.equal((await post(b, "google-link/unlink")).json.code, "GOOGLE_REAUTH_REQUIRED");
    assert.equal((await accounts(user.id)).length, 0);
    assert.equal((await browser().signIn(user.email)).status, 200);
    assert.ok((await sessionsOf(user.id)).length);
  });

  it("rejects another session for the same user, failed reconfirmations and changed security settings", async () => {
    const { user, b } = await ownerBrowser();
    await db.updateTable("auth_sessions").set({ created_at: new Date(Date.now() - 2 * 86400_000) }).where("user_id", "=", user.id).execute();
    assert.equal((await verify(b)).status, 200); // Reauthentication works even with an old session.
    assert.equal((await verify(b, { password: "wrong" })).json.code, "INVALID_PASSWORD");
    assert.equal((await post(b, "link-social", { provider: "google" })).json.code, "GOOGLE_REAUTH_REQUIRED");
    await verify(b);
    const state = await start(b);
    const sameUser = browser();
    await sameUser.signIn(user.email);
    b.jar.set("menupilot.session_token", sameUser.jar.get("menupilot.session_token"));
    assert.match((await callback(b, state, { sub: "another-session", email: "new@example.test" })).headers.get("location"), /GOOGLE_REAUTH_REQUIRED/);
    await verify(b);
    await db.updateTable("users").set({ password: await hashPassword("Changed#12345") }).where("id", "=", user.id).execute();
    assert.equal((await post(b, "link-social", { provider: "google" })).json.code, "GOOGLE_REAUTH_REQUIRED");
    assert.equal((await accounts(user.id)).length, 0);
  });

  it("serializes concurrent unlinking so one usable Google sign-in always remains", async () => {
    const user = await makeUser();
    const first = await bind(user, "first");
    const second = await bind(user, "second", "second@example.test");
    const clients = [browser(), browser()];
    for (const [i, b] of clients.entries()) {
      const login = await post(b, "sign-in/social", { provider: "google", callbackURL: "/login" });
      await callback(b, new URL(login.json.url).searchParams.get("state"), { sub: "first", email: "linked@example.test" });
      await verify(b, { action: "unlink", accountId: i ? second : first });
      assert.match((await callback(b, await start(b), { sub: "first", email: "linked@example.test" })).headers.get("location"), /GOOGLE_REAUTHENTICATED/);
    }
    const results = await Promise.all(clients.map((b) => post(b, "google-link/unlink")));
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
    assert.equal(results.find((r) => r.status === 400).json.code, "FAILED_TO_UNLINK_LAST_ACCOUNT");
    assert.equal((await accounts(user.id)).length, 1);
  });
});
