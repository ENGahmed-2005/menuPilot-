/* config.js — every setting of the auth service, read once from the environment.
   docs/auth.md lists them with examples; auth/.env.example is a starting point. */

const env = process.env;

const list = (value, fallback = "") => (value ?? fallback).split(",").map((s) => s.trim()).filter(Boolean);
const flag = (value, fallback) => (value === undefined || value === "" ? fallback : !["0", "false", "no", "off"].includes(value.toLowerCase()));

const production = env.NODE_ENV === "production";

// The frontends that proxy /api/auth/* here (same-origin cookies). Exact hosts
// only: links in e-mails are built from the host a request names, so a
// wildcard on a shared domain (*.vercel.app) would let anyone with a matching
// project receive password-reset links. Add Vercel preview hosts one by one.
const DEFAULT_HOSTS = [
  "menupilot.vercel.app",
  "frontend-production-351d.up.railway.app",
  ...(production ? [] : ["localhost:5173"]),
].join(",");

function database() {
  const url = env.DATABASE_URL || env.MYSQL_URL;
  if (url) {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
    };
  }
  // The same names as Laravel's .env (and Railway's MySQL plugin as a fallback).
  return {
    host: env.DB_HOST || env.MYSQLHOST || "127.0.0.1",
    port: Number(env.DB_PORT || env.MYSQLPORT || 3306),
    user: env.DB_USERNAME || env.MYSQLUSER || "root",
    password: env.DB_PASSWORD ?? env.MYSQLPASSWORD ?? "",
    database: env.DB_DATABASE || env.MYSQLDATABASE || "menupilot",
  };
}

const smtp = env.SMTP_HOST
  ? {
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 587),
      secure: flag(env.SMTP_SECURE, Number(env.SMTP_PORT) === 465),
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD || "" } : undefined,
    }
  : null;

const google = env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
  ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
  : null;

export const config = {
  production,
  port: Number(env.PORT || 3005),
  secret: env.BETTER_AUTH_SECRET || "",
  cookiePrefix: env.AUTH_COOKIE_PREFIX || "menupilot",
  allowedHosts: list(env.AUTH_ALLOWED_HOSTS, DEFAULT_HOSTS),
  // Used when a request's host is not in the list (e.g. links in e-mails sent
  // from a request that reached the service directly).
  fallbackURL: env.AUTH_FALLBACK_URL || (production ? "https://menupilot.vercel.app" : "http://localhost:5173"),
  trustedOrigins: list(env.FRONTEND_ORIGINS),
  database: database(),
  google,
  smtp,
  mailFrom: { address: env.MAIL_FROM_ADDRESS || "no-reply@menupilot.app", name: env.MAIL_FROM_NAME || "menuPilot" },
  // New owners confirm their e-mail before the first sign-in, when e-mail can be sent.
  requireEmailVerification: Boolean(smtp || (!production && ["memory", "log"].includes(env.MAIL_TRANSPORT))) && flag(env.AUTH_REQUIRE_EMAIL_VERIFICATION, true),
  // Where the client IP is read from, and how many proxies in front of this
  // service append to that header (the client is that many places from the right).
  clientIp: { header: (env.AUTH_CLIENT_IP_HEADER || "x-forwarded-for").toLowerCase(), hops: Math.max(1, Number(env.AUTH_PROXY_HOPS || 1)) },
  rateLimit: flag(env.AUTH_RATE_LIMIT, true),
  // Refuse passwords found in public breaches (k-anonymity: only 5 hash characters leave).
  pwnedCheck: flag(env.AUTH_PWNED_CHECK, production),
};

export function assertConfig() {
  if (config.secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be set to at least 32 random characters (e.g. `openssl rand -base64 32`).");
  }
}
