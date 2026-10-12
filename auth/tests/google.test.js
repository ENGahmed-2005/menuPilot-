/* Google sign-in end to end, with Google itself simulated: the authorization
   URL Better Auth builds, then the callback, where the code-for-token exchange
   (https://oauth2.googleapis.com/token) is answered here with an ID token. */
import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

process.env.GOOGLE_CLIENT_ID = "test-client.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
const { browser, db, makeStaff, makeUser, reset, sessionsOf } = await import("./helpers.js");

beforeEach(reset);
after(() => db.destroy());

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
let googleUser = null;
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("https://oauth2.googleapis.com/token")) {
    const idToken = `${b64url({ alg: "RS256", kid: "test" })}.${b64url({
      iss: "https://accounts.google.com", aud: process.env.GOOGLE_CLIENT_ID, sub: googleUser.sub,
      email: googleUser.email, email_verified: googleUser.verified ?? true, name: "Google Person",
      iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600,
    })}.signature`;
    return new Response(JSON.stringify({ access_token: "ya29.test", id_token: idToken, expires_in: 3599, token_type: "Bearer", scope: "openid email profile" }), { headers: { "content-type": "application/json" } });
  }
  return realFetch(input, init);
};

/** Starts "Sign in with Google" and comes back from Google as `user`. Returns the final redirect. */
async function googleSignIn(b, user) {
  const start = await b.call("/api/auth/sign-in/social", { method: "POST", body: { provider: "google", callbackURL: "/login?google=1", errorCallbackURL: "/login" } });
  assert.equal(start.status, 200);
  const auth = new URL(start.json.url);
  googleUser = user;
  const back = await b.call(`/api/auth/callback/google?code=test-code&state=${encodeURIComponent(auth.searchParams.get("state"))}`);
  return { auth, status: back.status, location: back.headers.get("location") || "" };
}

describe("Google sign-in", () => {
  it("asks Google for the right redirect address and account picker", async () => {
    const cfg = await (await browser().call("/api/auth-config")).json;
    assert.equal(cfg.googleEnabled, true);
    const start = await browser().call("/api/auth/sign-in/social", { method: "POST", body: { provider: "google", callbackURL: "/login?google=1" } });
    const url = new URL(start.json.url);
    assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
    assert.equal(url.searchParams.get("redirect_uri"), "http://localhost:5173/api/auth/callback/google");
    assert.equal(url.searchParams.get("client_id"), process.env.GOOGLE_CLIENT_ID);
    assert.equal(url.searchParams.get("prompt"), "select_account");
    assert.match(url.searchParams.get("scope"), /email/);
  });

  it("signs an existing account in and links Google to it", async () => {
    const owner = await makeUser();
    const b = browser();
    const res = await googleSignIn(b, { sub: "google-1", email: owner.email });
    assert.equal(res.status, 302);
    assert.equal(res.location, "/login?google=1");
    assert.ok(b.sessionToken());
    assert.equal((await sessionsOf(owner.id)).length, 1);
    const linked = await db.selectFrom("auth_accounts").selectAll().where("provider_id", "=", "google").execute();
    assert.equal(linked.length, 1);
    assert.equal(Number(linked[0].user_id), owner.id);
    assert.equal(linked[0].account_id, "google-1");
    assert.notEqual(linked[0].access_token, "ya29.test"); // stored encrypted
    assert.equal((await b.call("/api/auth/get-session")).json.user.id, String(owner.id));
  });

  it("creates no account for an unknown e-mail", async () => {
    const res = await googleSignIn(browser(), { sub: "google-2", email: "stranger@gmail.test" });
    assert.match(res.location, /^\/login\?error=signup_disabled/);
    assert.equal(await db.selectFrom("users").select("id").where("email", "=", "stranger@gmail.test").executeTakeFirst(), undefined);
  });

  it("refuses a disabled staff member, and accounts with two-step verification", async () => {
    const owner = await makeUser();
    const cashier = await makeStaff(owner.id, "cashier", { active: 0 });
    let res = await googleSignIn(browser(), { sub: "google-3", email: cashier.email });
    assert.match(res.location, /^\/login\?error=ACCOUNT_DISABLED&error_description=/);
    assert.equal((await sessionsOf(cashier.id)).length, 0);

    const guarded = await makeUser({ two_factor_enabled: 1 });
    res = await googleSignIn(browser(), { sub: "google-4", email: guarded.email });
    assert.match(res.location, /^\/login\?error=TWO_FACTOR_USE_PASSWORD/);
    assert.equal((await sessionsOf(guarded.id)).length, 0);
  });

  it("does not link a Google account whose e-mail Google hasn't verified", async () => {
    const owner = await makeUser();
    const res = await googleSignIn(browser(), { sub: "google-5", email: owner.email, verified: false });
    assert.match(res.location, /^\/login\?error=account_not_linked/);
    assert.equal((await sessionsOf(owner.id)).length, 0);
  });

  it("does not link Google to an account whose own e-mail was never confirmed (pre-registered address)", async () => {
    const squatter = await makeUser({ email_verified: 0 });
    const res = await googleSignIn(browser(), { sub: "google-6", email: squatter.email });
    assert.match(res.location, /^\/login\?error=account_not_linked/);
    assert.equal((await sessionsOf(squatter.id)).length, 0);
    assert.equal((await db.selectFrom("auth_accounts").select("id").where("provider_id", "=", "google").execute()).length, 0);
  });

  it("links Google from the Security page while signed in, only for the same e-mail", async () => {
    const owner = await makeUser();
    const b = browser();
    assert.equal((await b.signIn(owner.email)).status, 200);

    const link = async (user) => {
      const start = await b.call("/api/auth/link-social", { method: "POST", body: { provider: "google", callbackURL: "/account/security?linked=google", errorCallbackURL: "/account/security" } });
      assert.equal(start.status, 200);
      googleUser = user;
      const state = new URL(start.json.url).searchParams.get("state");
      return (await b.call(`/api/auth/callback/google?code=test-code&state=${encodeURIComponent(state)}`)).headers.get("location") || "";
    };
    assert.match(await link({ sub: "google-7", email: "someone-else@gmail.test" }), /^\/account\/security\?error=/);
    assert.equal(await link({ sub: "google-8", email: owner.email }), "/account/security?linked=google");
    const accounts = (await b.call("/api/auth/list-accounts")).json.map((a) => a.providerId).sort();
    assert.deepEqual(accounts, ["credential", "google"]);

    // And Google signs that account in from now on.
    const res = await googleSignIn(browser(), { sub: "google-8", email: owner.email });
    assert.equal(res.location, "/login?google=1");
  });
});
