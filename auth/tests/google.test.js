/* Google sign-in end to end, with Google itself simulated: the authorization
   URL Better Auth builds, then the callback, where the code-for-token exchange
   (https://oauth2.googleapis.com/token) is answered here with an ID token. */
import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

process.env.GOOGLE_CLIENT_ID = "test-client.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
const { browser, db, makeStaff, makeUser, PASSWORD, reset, sessionsOf } = await import("./helpers.js");

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

  it("signs an existing linked identity in by subject", async () => {
    const owner = await makeUser();
    await db.insertInto("auth_accounts").values({ id: "google-linked-1", user_id: owner.id, provider_id: "google", account_id: "google-1" }).execute();
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
    const b = browser();
    const res = await googleSignIn(b, { sub: "google-2", email: "stranger@gmail.test" });
    assert.match(res.location, /^\/login\?error=GOOGLE_REGISTRATION_REQUIRED/);
    assert.equal(await db.selectFrom("users").select("id").where("email", "=", "stranger@gmail.test").executeTakeFirst(), undefined);
    assert.equal(b.sessionToken(), null);
    const info = await b.call("/api/auth/google-registration");
    assert.equal(info.json.email, "stranger@gmail.test");
    assert.equal(typeof info.json.csrf, "string");
    assert.equal((await b.call("/api/auth/google-registration/session", { method: "POST", body: {} })).status, 400);
  });

  it("refuses unverified new identities and expired or missing onboarding cookies", async () => {
    const b = browser();
    const res = await googleSignIn(b, { sub: "unverified-new", email: "new@gmail.test", verified: false });
    assert.match(res.location, /error=email_not_verified/);
    assert.equal((await b.call("/api/auth/google-registration")).status, 401);
    assert.equal((await db.selectFrom("google_registrations").selectAll().execute()).length, 0);
  });

  it("starts a gated session after Laravel completion, and refuses suspended owners on retry", async () => {
    const b = browser();
    await googleSignIn(b, { sub: "new-complete", email: "complete@gmail.test" });
    // Laravel's transaction is covered by its feature tests; here simulate its committed rows.
    const owner = await makeUser({ email: "complete@gmail.test" });
    await db.insertInto("auth_accounts").values({ id: "new-complete-account", user_id: owner.id, provider_id: "google", account_id: "new-complete" }).execute();
    await db.updateTable("google_registrations").set({ user_id: owner.id }).where("subject", "=", "new-complete").execute();
    await db.updateTable("users").set({ is_active: 0 }).where("id", "=", owner.id).execute();
    assert.equal((await b.call("/api/auth/google-registration/session", { method: "POST", body: {} })).json.code, "ACCOUNT_DISABLED");
    await db.updateTable("users").set({ is_active: 1 }).where("id", "=", owner.id).execute();
    const proof = [...b.jar].find(([name]) => name.endsWith(".google_registration"));
    assert.equal((await b.call("/api/auth/google-registration/session", { method: "POST", body: {} })).status, 200);
    assert.equal((await b.call("/api/auth/get-session")).json.user.id, String(owner.id));
    await b.call("/api/auth/sign-out", { method: "POST", body: {} });
    b.jar.set(...proof);
    assert.equal((await b.call("/api/auth/google-registration/session", { method: "POST", body: {} })).status, 401);
    assert.equal((await b.call("/api/auth/get-session")).json, null);
  });

  it("handles cancellation without creating users or pending registrations", async () => {
    const b = browser();
    const start = await b.call("/api/auth/sign-in/social", { method: "POST", body: { provider: "google", callbackURL: "/login", errorCallbackURL: "/register" } });
    const state = new URL(start.json.url).searchParams.get("state");
    const res = await b.call(`/api/auth/callback/google?error=access_denied&state=${encodeURIComponent(state)}`);
    assert.match(res.headers.get("location"), /^\/register\?error=access_denied/);
    assert.equal((await db.selectFrom("users").select("id").execute()).length, 0);
    assert.equal((await db.selectFrom("google_registrations").selectAll().execute()).length, 0);
  });

  it("completes through Laravel concurrently and starts one trial", { skip: !process.env.LARAVEL_TEST_URLS }, async () => {
    const b = browser();
    await googleSignIn(b, { sub: "concurrent-google", email: "concurrent@gmail.test" });
    const info = await b.call("/api/auth/google-registration");
    const cookie = [...b.jar].map(([k, v]) => `${k}=${v}`).join("; ");
    const urls = process.env.LARAVEL_TEST_URLS.split(",");
    // Separate PHP servers share the test DB, so requests actually overlap.
    const complete = (url) => realFetch(`${url}/api/account/register/google`, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", Cookie: cookie, "X-Google-Registration": info.json.csrf },
      body: JSON.stringify({ restaurant_name: "Concurrent Olive", restaurant_type: "cafe", role: "admin", email: "forged@example.test" }),
    });
    const responses = await Promise.all(urls.map(complete));
    for (const response of responses) assert.equal(response.status, 200, await response.text());
    const users = await db.selectFrom("users").selectAll().where("email", "=", "concurrent@gmail.test").execute();
    assert.equal(users.length, 1);
    assert.equal(users[0].role, "owner");
    assert.equal(users[0].restaurant_type, "cafe");
    const trial = users[0].trial_started_at.getTime();
    assert.equal((await complete(urls[0])).status, 200);
    assert.equal((await db.selectFrom("users").select("trial_started_at").where("id", "=", users[0].id).executeTakeFirst()).trial_started_at.getTime(), trial);
    assert.equal((await db.selectFrom("auth_accounts").selectAll().where("account_id", "=", "concurrent-google").execute()).length, 1);
    assert.equal((await db.selectFrom("audit_logs").select("id").where("restaurant_id", "=", users[0].id).where("action", "=", "subscription.trial_started").execute()).length, 1);
    assert.equal((await b.call("/api/auth/google-registration/session", { method: "POST", body: {} })).status, 200);
    assert.equal((await b.call("/api/auth/get-session")).json.user.id, String(users[0].id));
  });

  it("deduplicates parallel OAuth attempts for the same identity", { skip: !process.env.LARAVEL_TEST_URLS }, async () => {
    const browsers = [browser(), browser()];
    for (const b of browsers) await googleSignIn(b, { sub: "two-attempts", email: "two@gmail.test" });
    const urls = process.env.LARAVEL_TEST_URLS.split(",");
    const requests = await Promise.all(browsers.map(async (b, i) => {
      const info = await b.call("/api/auth/google-registration");
      return realFetch(`${urls[i % urls.length]}/api/account/register/google`, {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", Cookie: [...b.jar].map(([k, v]) => `${k}=${v}`).join("; "), "X-Google-Registration": info.json.csrf },
        body: JSON.stringify({ restaurant_name: "Olive", restaurant_type: "restaurant" }),
      });
    }));
    assert.deepEqual(requests.map((r) => r.status).sort(), [200, 409]);
    assert.equal((await db.selectFrom("users").select("id").where("email", "=", "two@gmail.test").execute()).length, 1);
    assert.equal((await db.selectFrom("auth_accounts").select("id").where("account_id", "=", "two-attempts").execute()).length, 1);
    const retry = await googleSignIn(browser(), { sub: "two-attempts", email: "two@gmail.test" });
    assert.equal(retry.location, "/login?google=1");
  });

  it("refuses a disabled staff member, and accounts with two-step verification", async () => {
    const owner = await makeUser();
    const cashier = await makeStaff(owner.id, "cashier", { active: 0 });
    await db.insertInto("auth_accounts").values({ id: "disabled-google", user_id: cashier.id, provider_id: "google", account_id: "google-3" }).execute();
    let res = await googleSignIn(browser(), { sub: "google-3", email: cashier.email });
    assert.match(res.location, /^\/login\?error=ACCOUNT_DISABLED&error_description=/);
    assert.equal((await sessionsOf(cashier.id)).length, 0);

    const guarded = await makeUser({ two_factor_enabled: 1 });
    await db.insertInto("auth_accounts").values({ id: "guarded-google", user_id: guarded.id, provider_id: "google", account_id: "google-4" }).execute();
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

  it("links Google from Security only after reauthentication, including a different email", async () => {
    const owner = await makeUser();
    const b = browser();
    assert.equal((await b.signIn(owner.email)).status, 200);

    const link = async (user) => {
      assert.equal((await b.call("/api/auth/google-link/verify", { method: "POST", body: { action: "link", password: PASSWORD } })).status, 200);
      const start = await b.call("/api/auth/link-social", { method: "POST", body: { provider: "google", callbackURL: "/account/security?linked=google", errorCallbackURL: "/account/security" } });
      assert.equal(start.status, 200);
      googleUser = user;
      const state = new URL(start.json.url).searchParams.get("state");
      return (await b.call(`/api/auth/callback/google?code=test-code&state=${encodeURIComponent(state)}`)).headers.get("location") || "";
    };
    assert.equal(await link({ sub: "google-7", email: "someone-else@gmail.test" }), "/account/security?linked=google");
    assert.equal(await link({ sub: "google-8", email: owner.email }), "/account/security?linked=google");
    const accounts = (await b.call("/api/auth/list-accounts")).json.map((a) => a.providerId).sort();
    assert.deepEqual(accounts, ["credential", "google", "google"]);

    // And Google signs that account in from now on.
    const res = await googleSignIn(browser(), { sub: "google-8", email: owner.email });
    assert.equal(res.location, "/login?google=1");
  });
});
