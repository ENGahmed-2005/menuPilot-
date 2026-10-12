/* auth.js — Better Auth for menuPilot, on Laravel's MySQL tables (docs/auth.md).
   Laravel owns accounts (registration, staff, admin) and the schema; this
   service only signs people in and out: password (+ two-step code), Google
   for existing accounts, e-mail confirmation, password reset, devices.
   Laravel reads the same auth_sessions rows (App\Support\AuthSessions). */
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { haveIBeenPwned, twoFactor } from "better-auth/plugins";
import { invalidateSchemaChecks } from "@better-auth/core/db/internal";
import { assertConfig, config } from "./config.js";
import { db } from "./db.js";
import { devices } from "./devices.js";
import {
  accountLocked, assertMaySignIn, clearFailures, findUserByEmail, isLocked, mayReceiveMail,
  recordFailure, syncCredentialFromUser, syncUserFromCredential,
} from "./gates.js";
import { CLIENT_IP_HEADER } from "./ip.js";
import { mailEnabled, sendResetMail, sendVerificationMail } from "./mail.js";
import { hashPassword, passwordProblem, verifyPassword } from "./passwords.js";

assertConfig();

const BASE_PATH = "/api/auth";
const DAY = 24 * 60 * 60;

const WEAK_PASSWORD = {
  TOO_SHORT: "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
  MIXED_CASE: "كلمة المرور يجب أن تحتوي على حرف إنجليزي كبير وحرف صغير.",
  NUMBER: "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.",
  SYMBOL: "كلمة المرور يجب أن تحتوي على رمز مثل ! أو # أو @.",
  TOO_LONG: "كلمة المرور طويلة جدًا.",
};

/* Rate limits per client IP. The per-account lockout (gates.js) is what stops
   password guessing; these slow down scripts. A request whose IP is unknown is
   not limited here rather than sharing one bucket with every other visitor. */
const LIMITS = [
  [/^\/sign-in\//, { window: 60, max: 10 }],
  [/^\/two-factor\/verify-/, { window: 60, max: 10 }],
  [/^\/(request-password-reset|send-verification-email)$/, { window: 15 * 60, max: 5 }],
  [/^\/(reset-password|change-password)/, { window: 10 * 60, max: 10 }],
];
function limitFor(request, current) {
  if (!request.headers.get(CLIENT_IP_HEADER)) return false;
  const path = new URL(request.url).pathname.replace(BASE_PATH, "") || "/";
  return LIMITS.find(([re]) => re.test(path))?.[1] ?? current;
}

// Sign-in errors raised after the password matched.
const PASSWORD_WAS_RIGHT = new Set(["EMAIL_NOT_VERIFIED", "ACCOUNT_DISABLED", "TWO_FACTOR_USE_PASSWORD"]);

const fail = (status, code, message) => APIError.from(status, { code, message });
const returnedCode = (returned) => (isAPIError(returned) ? returned.body?.code : null);

export const auth = betterAuth({
  appName: "menuPilot",
  secret: config.secret,
  basePath: BASE_PATH,
  // The browser only talks to the frontend origin, which proxies /api/auth/*
  // here: links and cookies use that origin (X-Forwarded-Host, checked against the list).
  baseURL: { allowedHosts: config.allowedHosts, fallback: config.fallbackURL, protocol: "auto" },
  trustedOrigins: config.trustedOrigins,
  database: { db, type: "mysql", transaction: true },
  telemetry: { enabled: false },

  user: {
    modelName: "users",
    fields: { emailVerified: "email_verified", createdAt: "created_at", updatedAt: "updated_at" },
  },
  session: {
    modelName: "auth_sessions",
    fields: { userId: "user_id", expiresAt: "expires_at", ipAddress: "ip_address", userAgent: "user_agent", createdAt: "created_at", updatedAt: "updated_at" },
    expiresIn: 7 * DAY,
    updateAge: DAY,
    freshAge: DAY,
    // Every request checks the database, so a revoked or disabled session ends at once.
    cookieCache: { enabled: false },
  },
  account: {
    modelName: "auth_accounts",
    fields: {
      accountId: "account_id", providerId: "provider_id", userId: "user_id",
      accessToken: "access_token", refreshToken: "refresh_token", idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at", refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at", updatedAt: "updated_at",
    },
    // Google signs in an existing account with the same e-mail only when Google
    // vouches for that e-mail AND the menuPilot account confirmed it too (no
    // "trusted provider" shortcut): otherwise an unverified Google address, or
    // an account pre-registered with someone else's address, could be linked.
    accountLinking: { enabled: true, allowDifferentEmails: false, requireLocalEmailVerified: true },
    encryptOAuthTokens: true,
  },
  verification: {
    modelName: "auth_verifications",
    fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at" },
  },
  rateLimit: {
    enabled: config.rateLimit,
    storage: "database",
    modelName: "auth_rate_limits",
    fields: { lastRequest: "last_request" },
    window: 60,
    max: 100,
    customRules: { "/**": limitFor },
  },

  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // restaurants register through Laravel (POST /api/account/register)
    requireEmailVerification: config.requireEmailVerification,
    minPasswordLength: 8,
    maxPasswordLength: 72,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    password: { hash: hashPassword, verify: verifyPassword },
    sendResetPassword: mailEnabled
      ? async ({ user, url }) => { if (await mayReceiveMail(user.id)) await sendResetMail(user, url); }
      : undefined,
    onPasswordReset: async ({ user }) => { await syncUserFromCredential(user.id); },
  },
  emailVerification: mailEnabled
    ? {
        sendVerificationEmail: async ({ user, url }) => {
          if (!(await mayReceiveMail(user.id))) return;
          // The link re-sent by a sign-in attempt has no destination: the sign-in page signs them in.
          const link = new URL(url);
          if (!link.searchParams.get("callbackURL") || link.searchParams.get("callbackURL") === "/") link.searchParams.set("callbackURL", "/login?verified=1");
          await sendVerificationMail(user, link.toString());
        },
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
        expiresIn: 60 * 60,
      }
    : undefined,
  socialProviders: config.google
    ? { google: { ...config.google, prompt: "select_account", disableImplicitSignUp: true, disableSignUp: true } }
    : {},

  plugins: [
    twoFactor({
      issuer: "menuPilot",
      backupCodeOptions: { amount: 10, length: 10 },
      schema: {
        user: { fields: { twoFactorEnabled: "two_factor_enabled" } },
        twoFactor: {
          modelName: "auth_two_factors",
          fields: { backupCodes: "backup_codes", userId: "user_id", failedVerificationCount: "failed_verification_count", lockedUntil: "locked_until" },
        },
      },
    }),
    ...(config.pwnedCheck
      ? [haveIBeenPwned({ customPasswordCompromisedMessage: "كلمة المرور هذه ظهرت في تسريبات بيانات معروفة. اختر كلمة مرور أخرى." })]
      : []),
    devices(),
  ],

  advanced: {
    cookiePrefix: config.cookiePrefix,
    trustedProxyHeaders: true,
    ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    // Checked once at start-up instead (checkSchema below).
    database: { validateSchema: false },
    // Always on (Better Auth skips it when NODE_ENV=test).
    disableOriginCheck: false,
    disableCSRFCheck: false,
  },
  onAPIError: { errorURL: "/login" },

  databaseHooks: {
    // Accounts are created by Laravel only (it starts the trial, the restaurant…).
    user: { create: { before: async () => false } },
    session: {
      create: {
        before: async (session, ctx) => {
          const user = await assertMaySignIn(session.userId);
          // Google can't skip the two-step code: those accounts sign in with password + code.
          const path = ctx?.path || "";
          if (user.two_factor_enabled && (path.startsWith("/callback") || path.startsWith("/oauth2/callback") || path === "/sign-in/social")) {
            throw fail("FORBIDDEN", "TWO_FACTOR_USE_PASSWORD", "هذا الحساب محمي بالتحقق بخطوتين: سجّل الدخول بالبريد وكلمة المرور ثم الرمز.");
          }
        },
      },
    },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Better Auth checks the Origin of requests that carry cookies; a sign-in
      // posted from another site carries none (login CSRF), so check every POST.
      const origin = ctx.request?.method === "POST" ? ctx.request.headers.get("origin") : null;
      if (origin && !ctx.context.isTrustedOrigin(origin)) throw fail("FORBIDDEN", "INVALID_ORIGIN", "Invalid origin");

      switch (ctx.path) {
        case "/sign-in/email": {
          const user = await findUserByEmail(ctx.body?.email);
          if (isLocked(user)) throw accountLocked();
          await syncCredentialFromUser(user);
          return;
        }
        case "/change-password":
        case "/reset-password": {
          const problem = passwordProblem(ctx.body?.newPassword);
          if (problem) throw fail("BAD_REQUEST", "WEAK_PASSWORD", WEAK_PASSWORD[problem]);
          return;
        }
        // The profile (name, e-mail, deletion) is Laravel's; the password account stays.
        case "/update-user":
        case "/change-email":
        case "/delete-user":
          throw fail("NOT_FOUND", "NOT_AVAILABLE", "Not available");
        case "/unlink-account":
          if (ctx.body?.providerId === "credential") throw fail("BAD_REQUEST", "CANNOT_UNLINK_PASSWORD", "لا يمكن إزالة كلمة المرور من الحساب.");
          return;
        default:
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const returned = ctx.context.returned;
      if (ctx.path === "/sign-in/email") {
        const user = await findUserByEmail(ctx.body?.email);
        if (!user) return;
        const code = returnedCode(returned);
        if (code === "INVALID_EMAIL_OR_PASSWORD") {
          if (await recordFailure(user.id)) throw accountLocked();
        } else if (!code || PASSWORD_WAS_RIGHT.has(code)) {
          await clearFailures(user.id); // even when a two-step code or a check follows
        }
        return;
      }
      if (ctx.path === "/change-password" && !isAPIError(returned)) {
        const userId = ctx.context.session?.user?.id ?? ctx.context.newSession?.user?.id;
        if (userId) await syncUserFromCredential(userId);
      }
    }),
  },
});

/* Laravel's schema against what this config expects, once at start-up. The one
   known difference: users.password is required and Better Auth never writes it,
   which is right here (it never creates users). Anything else stops the service. */
const EXPECTED = (f) => f.kind === "unexpected-required-column" && f.table === "users" && f.column === "password";

export async function checkSchema() {
  const ctx = await auth.$context;
  invalidateSchemaChecks(ctx.options.database); // a failed check is cached: ask the database again
  try {
    await ctx.explicitSchemaCheck?.();
  } catch (error) {
    const problems = (error?.findings ?? [error]).filter((f) => !EXPECTED(f));
    if (problems.length) throw new Error(`Database schema doesn't match the auth service (run Laravel's migrations): ${JSON.stringify(problems)}`);
  }
}
