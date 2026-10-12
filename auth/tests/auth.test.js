import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import * as OTPAuth from "otpauth";
import { PASSWORD, app, browser, checkSchema, db, hashPassword, makeStaff, makeUser, reset, sentMail, sessionsOf, userRow } from "./helpers.js";

beforeEach(reset);
after(() => db.destroy());

const totp = (uri) => OTPAuth.URI.parse(uri).generate();

describe("the service", () => {
  it("matches Laravel's schema and reports what the screens may offer", async () => {
    await checkSchema();
    const health = await app.request("/health");
    assert.equal(health.status, 200);
    assert.equal((await app.request("/live")).status, 200);
    const cfg = await (await app.request("/api/auth-config")).json();
    assert.deepEqual(cfg, { emailEnabled: true, googleEnabled: false, emailVerificationRequired: true });
  });
});

describe("password sign-in", () => {
  it("signs in with the hash Laravel wrote, sets an httpOnly cookie and never returns the token", async () => {
    const owner = await makeUser();
    const b = browser();
    const res = await b.signIn(owner.email.toUpperCase());

    assert.equal(res.status, 200);
    assert.equal(res.json.user.id, String(owner.id));
    assert.equal(res.json.token, undefined);
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith("menupilot.session_token="));
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);

    const [session] = await sessionsOf(owner.id);
    assert.equal(session.token, b.sessionToken());
    assert.equal(session.ip_address, "203.0.113.10");

    const me = await b.call("/api/auth/get-session");
    assert.equal(me.json.user.email, owner.email);
    assert.equal(me.json.session.token, undefined);
  });

  it("uses the password Laravel set most recently", async () => {
    const owner = await makeUser();
    assert.equal((await browser().signIn(owner.email)).status, 200);
    await db.updateTable("users").set({ password: await hashPassword("Changed#456") }).where("id", "=", owner.id).execute();

    assert.equal((await browser().signIn(owner.email)).status, 401);
    assert.equal((await browser().signIn(owner.email, "Changed#456")).status, 200);
  });

  it("locks the account for 15 minutes after 5 wrong passwords", async () => {
    const owner = await makeUser();
    const b = browser();
    for (let i = 1; i <= 4; i++) {
      const res = await b.signIn(owner.email, "Wrong#123");
      assert.equal(res.status, 401);
      assert.equal(res.json.code, "INVALID_EMAIL_OR_PASSWORD");
    }
    const fifth = await b.signIn(owner.email, "Wrong#123");
    assert.equal(fifth.status, 429);
    assert.equal(fifth.json.code, "ACCOUNT_LOCKED");

    // Even the right password waits, from any address.
    const locked = await browser({ ip: "198.51.100.4" }).signIn(owner.email);
    assert.equal(locked.json.code, "ACCOUNT_LOCKED");
    assert.equal((await sessionsOf(owner.id)).length, 0);

    await db.updateTable("users").set({ login_locked_until: new Date(Date.now() - 1000) }).where("id", "=", owner.id).execute();
    assert.equal((await b.signIn(owner.email)).status, 200);
    const row = await userRow(owner.id);
    assert.equal(row.login_failed_attempts, 0);
    assert.equal(row.login_locked_until, null);
  });

  it("answers an unknown e-mail like a wrong password", async () => {
    const res = await browser().signIn("nobody@menupilot.test");
    assert.equal(res.status, 401);
    assert.equal(res.json.code, "INVALID_EMAIL_OR_PASSWORD");
  });

  it("refuses requests from another site", async () => {
    const owner = await makeUser();
    const res = await browser().call("/api/auth/sign-in/email", {
      method: "POST", body: { email: owner.email, password: PASSWORD }, headers: { origin: "https://evil.example" },
    });
    assert.equal(res.status, 403);
    assert.equal((await sessionsOf(owner.id)).length, 0);
  });

  it("has no self sign-up: restaurants register through Laravel", async () => {
    const res = await browser().call("/api/auth/sign-up/email", { method: "POST", body: { email: "new@menupilot.test", password: PASSWORD, name: "X" } });
    assert.ok([400, 403, 404].includes(res.status));
    assert.equal(await db.selectFrom("users").select("id").where("email", "=", "new@menupilot.test").executeTakeFirst(), undefined);
  });
});

describe("who may hold a session", () => {
  const refused = async (email) => {
    const res = await browser().signIn(email);
    assert.equal(res.status, 403);
    assert.equal(res.json.code, "ACCOUNT_DISABLED");
  };

  it("refuses a disabled owner, a demo account, and staff who were removed, re-roled or whose restaurant is off", async () => {
    await refused((await makeUser({ is_active: 0 })).email);
    await refused((await makeUser({ is_demo: 1 })).email);

    const owner = await makeUser();
    const cashier = await makeStaff(owner.id, "cashier");
    assert.equal((await browser().signIn(cashier.email)).status, 200);

    await db.updateTable("staff").set({ active: 0 }).where("account_user_id", "=", cashier.id).execute();
    await refused(cashier.email);
    await db.updateTable("staff").set({ active: 1, role: "kitchen" }).where("account_user_id", "=", cashier.id).execute();
    await refused(cashier.email);
    await db.updateTable("staff").set({ role: "cashier" }).where("account_user_id", "=", cashier.id).execute();
    await db.updateTable("users").set({ is_active: 0 }).where("id", "=", owner.id).execute();
    await refused(cashier.email);
  });

  it("does not count a refused but correct password as a wrong one", async () => {
    const user = await makeUser({ is_active: 0, login_failed_attempts: 3 });
    await refused(user.email);
    assert.equal((await userRow(user.id)).login_failed_attempts, 0);
  });
});

describe("e-mail confirmation and password reset", () => {
  it("asks an unconfirmed owner to confirm, and the link signs them in", async () => {
    const owner = await makeUser({ email_verified: 0 });
    const b = browser();
    const res = await b.signIn(owner.email);
    assert.equal(res.status, 403);
    assert.equal(res.json.code, "EMAIL_NOT_VERIFIED");
    assert.equal(sentMail.length, 1);

    const link = new URL(sentMail[0].text.match(/https?:\/\/\S+/)[0]);
    assert.equal(link.origin, "http://localhost:5173");
    const verify = await b.call(link.pathname + link.search);
    assert.ok([200, 302].includes(verify.status));
    assert.equal((await userRow(owner.id)).email_verified, 1);
    assert.equal((await b.call("/api/auth/get-session")).json.user.id, String(owner.id));
  });

  it("resets a password by e-mail: the new hash reaches Laravel and every device is signed out", async () => {
    const owner = await makeUser();
    const phone = browser();
    await phone.signIn(owner.email);
    await db.updateTable("users").set({ api_token: "legacy" }).where("id", "=", owner.id).execute();

    const ask = await browser().call("/api/auth/request-password-reset", { method: "POST", body: { email: owner.email, redirectTo: "/reset-password" } });
    assert.equal(ask.status, 200);
    const token = sentMail.at(-1).text.match(/reset-password\/([^?\s]+)/)[1];

    const weak = await browser().call("/api/auth/reset-password", { method: "POST", body: { token, newPassword: "alllowercase1!" } });
    assert.equal(weak.json.code, "WEAK_PASSWORD");

    const done = await browser().call("/api/auth/reset-password", { method: "POST", body: { token, newPassword: "Fresh#Pass9" } });
    assert.equal(done.status, 200);

    const row = await userRow(owner.id);
    assert.match(row.password, /^\$2y\$12\$/);
    assert.ok(await bcrypt.compare("Fresh#Pass9", row.password.replace(/^\$2y\$/, "$2b$")));
    assert.equal(row.api_token, null);
    assert.equal((await sessionsOf(owner.id)).length, 0);
    assert.equal((await phone.call("/api/auth/get-session")).json, null);
    assert.equal((await browser().signIn(owner.email, "Fresh#Pass9")).status, 200);
  });

  it("does not trust menupilot.vercel.app (someone else's project), only the real frontend", async () => {
    const owner = await makeUser();
    const res = await browser().call("/api/auth/request-password-reset", {
      method: "POST", body: { email: owner.email, redirectTo: "/reset-password" },
      headers: { origin: "https://menupilot.vercel.app", "x-forwarded-host": "menupilot.vercel.app", "x-forwarded-proto": "https" },
    });
    assert.equal(res.status, 403);
    assert.equal(sentMail.length, 0);
  });

  it("never builds e-mail links on a host outside the exact list (no *.vercel.app look-alikes)", async () => {
    const owner = await makeUser();
    const evil = "https://menupilot-x-engahmed-2005.vercel.app";
    const forged = await browser().call("/api/auth/request-password-reset", {
      method: "POST", body: { email: owner.email, redirectTo: "/reset-password" },
      headers: { origin: evil, "x-forwarded-host": new URL(evil).host, "x-forwarded-proto": "https" },
    });
    assert.equal(forged.status, 403);
    // A trusted Origin with a forged host still gets links on the fallback address.
    await browser().call("/api/auth/request-password-reset", {
      method: "POST", body: { email: owner.email, redirectTo: "/reset-password" },
      headers: { "x-forwarded-host": new URL(evil).host },
    });
    assert.equal(sentMail.length, 1);
    assert.ok(!sentMail[0].text.includes("vercel.app"));
    assert.match(sentMail[0].text, /http:\/\/localhost:5173\/api\/auth\/reset-password\//);
  });

  it("answers a reset request for an unknown or demo address the same way, and sends nothing", async () => {
    const demo = await makeUser({ is_demo: 1 });
    for (const email of ["nobody@menupilot.test", demo.email]) {
      const res = await browser().call("/api/auth/request-password-reset", { method: "POST", body: { email, redirectTo: "/reset-password" } });
      assert.equal(res.status, 200);
    }
    assert.equal(sentMail.length, 0);
  });
});

describe("change password", () => {
  it("checks the current password and the rule, then writes the new hash back to Laravel", async () => {
    const owner = await makeUser();
    const b = browser();
    await b.signIn(owner.email);
    const other = browser({ ip: "198.51.100.9" });
    await other.signIn(owner.email);

    assert.equal((await b.call("/api/auth/change-password", { method: "POST", body: { currentPassword: PASSWORD, newPassword: "short" } })).json.code, "WEAK_PASSWORD");
    assert.equal((await b.call("/api/auth/change-password", { method: "POST", body: { currentPassword: "Wrong#123", newPassword: "Better#Pass1" } })).status, 400);

    const ok = await b.call("/api/auth/change-password", { method: "POST", body: { currentPassword: PASSWORD, newPassword: "Better#Pass1", revokeOtherSessions: true } });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.token, undefined);
    assert.ok(await bcrypt.compare("Better#Pass1", (await userRow(owner.id)).password.replace(/^\$2y\$/, "$2b$")));
    assert.equal((await other.call("/api/auth/get-session")).json, null);
    assert.equal((await b.call("/api/auth/get-session")).json.user.id, String(owner.id));
  });
});

describe("two-step verification", () => {
  it("is set up with the password and an app code, then asked for at every sign-in", async () => {
    const owner = await makeUser();
    const b = browser();
    await b.signIn(owner.email);

    assert.equal((await b.call("/api/auth/two-factor/enable", { method: "POST", body: { password: "Wrong#123" } })).status, 400);
    const enable = await b.call("/api/auth/two-factor/enable", { method: "POST", body: { password: PASSWORD } });
    assert.equal(enable.status, 200);
    assert.match(enable.json.totpURI, /^otpauth:\/\/totp\/menuPilot:/);
    assert.equal(enable.json.backupCodes.length, 10);
    assert.equal((await b.call("/api/auth/two-factor/verify-totp", { method: "POST", body: { code: totp(enable.json.totpURI) } })).status, 200);
    assert.equal((await userRow(owner.id)).two_factor_enabled, 1);

    // A new device: the password alone gives no session.
    const laptop = browser({ ip: "198.51.100.20" });
    const first = await laptop.signIn(owner.email);
    assert.equal(first.json.twoFactorRedirect, true);
    assert.equal(laptop.sessionToken(), null);
    assert.equal((await laptop.call("/api/auth/get-session")).json, null);

    assert.equal((await laptop.call("/api/auth/two-factor/verify-totp", { method: "POST", body: { code: "000000" } })).status, 401);
    const second = await laptop.call("/api/auth/two-factor/verify-totp", { method: "POST", body: { code: totp(enable.json.totpURI) } });
    assert.equal(second.status, 200);
    assert.equal(second.json.token, undefined);
    assert.equal((await laptop.call("/api/auth/get-session")).json.user.id, String(owner.id));

    // A backup code works once.
    const tablet = browser({ ip: "198.51.100.21" });
    await tablet.signIn(owner.email);
    const code = enable.json.backupCodes[0];
    assert.equal((await tablet.call("/api/auth/two-factor/verify-backup-code", { method: "POST", body: { code } })).status, 200);
    const again = browser({ ip: "198.51.100.22" });
    await again.signIn(owner.email);
    assert.notEqual((await again.call("/api/auth/two-factor/verify-backup-code", { method: "POST", body: { code } })).status, 200);
  });
});

describe("devices", () => {
  it("lists devices without tokens, marks this one, and signs another out by id", async () => {
    const owner = await makeUser();
    const phone = browser({ ip: "198.51.100.30" });
    const laptop = browser({ ip: "198.51.100.31" });
    await phone.signIn(owner.email);
    await laptop.signIn(owner.email);

    const list = await laptop.call("/api/auth/list-sessions");
    assert.equal(list.json.length, 2);
    assert.ok(list.json.every((s) => s.token === undefined));
    const mine = list.json.find((s) => s.current);
    const theirs = list.json.find((s) => !s.current);
    assert.equal(mine.ipAddress, "198.51.100.31");

    assert.equal((await laptop.call("/api/auth/revoke-device", { method: "POST", body: { id: theirs.id } })).status, 200);
    assert.equal((await phone.call("/api/auth/get-session")).json, null);
    assert.equal((await laptop.call("/api/auth/get-session")).json.session.id, mine.id);

    // Someone else's device id does nothing.
    const stranger = await makeUser();
    const s = browser();
    await s.signIn(stranger.email);
    await s.call("/api/auth/revoke-device", { method: "POST", body: { id: mine.id } });
    assert.equal((await laptop.call("/api/auth/get-session")).json.session.id, mine.id);

    assert.equal((await laptop.call("/api/auth/sign-out", { method: "POST", body: {} })).status, 200);
    assert.equal((await sessionsOf(owner.id)).length, 0);
  });

  it("keeps profile changes and password removal to Laravel", async () => {
    const owner = await makeUser();
    const b = browser();
    await b.signIn(owner.email);
    assert.equal((await b.call("/api/auth/update-user", { method: "POST", body: { name: "Hacked" } })).status, 404);
    assert.equal((await userRow(owner.id)).name, "Zaytoona");
    assert.equal((await b.call("/api/auth/unlink-account", { method: "POST", body: { providerId: "credential" } })).json.code, "CANNOT_UNLINK_PASSWORD");
  });
});

describe("client IP and rate limits", () => {
  it("reads the client from the right of X-Forwarded-For and ignores a forged internal header", async () => {
    const owner = await makeUser();
    const b = browser({ ip: "10.9.9.9, 203.0.113.77" });
    await b.call("/api/auth/sign-in/email", { method: "POST", body: { email: owner.email, password: PASSWORD }, headers: { "x-menupilot-client-ip": "1.2.3.4" } });
    const [session] = await sessionsOf(owner.id);
    assert.equal(session.ip_address, "203.0.113.77");
  });

  it("slows one address down after 10 sign-ins a minute, without touching others", async () => {
    const owner = await makeUser();
    const b = browser({ ip: "203.0.113.99" });
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await b.signIn("nobody@menupilot.test", "Wrong#123")).status);
    assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
    assert.equal(statuses[10], 429);
    assert.equal((await browser({ ip: "203.0.113.100" }).signIn(owner.email)).status, 200);
  });
});
