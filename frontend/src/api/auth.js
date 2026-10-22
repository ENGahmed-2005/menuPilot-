/* ==========================================================================
   auth.js — signing in and out, and the account's security (docs/auth.md)
   Better Auth (the auth/ service, reached same-origin at /api/auth/*) holds
   the session in an httpOnly cookie: no token is ever stored by this app.
   Laravel keeps everything else about the account (/api/account/*): who
   you are (me), registering a restaurant, the WhatsApp reset link.
   The «Try it» demo still uses its own token (api/demo.js).
   In mock mode (VITE_USE_MOCKS) everything stays in api/mockServer.js.
   ========================================================================== */
import { api, getToken, setToken } from "./client";
import { t } from "../i18n";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

// Loaded on first use (sign-in, Security page): a customer scanning a table's QR never downloads it.
let clientPromise = null;
const authClient = () => (clientPromise ??= import("./authClient").then((m) => m.authClient));

/* ---- errors: one Error with a translated message and the server's code ---- */
const MESSAGES = {
  GOOGLE_REGISTRATION_EXPIRED: "انتهت مهلة التسجيل. حاول باستخدام Google مجددًا.",
  INVALID_EMAIL_OR_PASSWORD: "البريد الإلكتروني أو كلمة المرور غير صحيحة. تأكد منهما وحاول مجددًا.",
  INVALID_PASSWORD: "كلمة المرور الحالية غير صحيحة.",
  EMAIL_NOT_VERIFIED: "لم تؤكد بريدك الإلكتروني بعد. أرسلنا لك رابط التأكيد من جديد، افتح بريدك ثم سجّل الدخول.",
  INVALID_CODE: "الرمز غير صحيح أو انتهت صلاحيته. أدخل الرمز الظاهر الآن في التطبيق.",
  INVALID_BACKUP_CODE: "رمز الاحتياط غير صحيح أو مستخدم من قبل.",
  INVALID_TWO_FACTOR_COOKIE: "انتهت مهلة إدخال الرمز. سجّل الدخول من جديد.",
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: "محاولات كثيرة. سجّل الدخول من جديد.",
  ACCOUNT_TEMPORARILY_LOCKED: "محاولات كثيرة خاطئة للرمز. انتظر قليلًا ثم حاول مجددًا.",
  INVALID_TOKEN: "رابط إعادة التعيين غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.",
  PASSWORD_COMPROMISED: "كلمة المرور هذه ظهرت في تسريبات بيانات معروفة. اختر كلمة مرور أخرى.",
  PASSWORD_TOO_SHORT: "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
  PASSWORD_TOO_LONG: "كلمة المرور طويلة جدًا.",
  SESSION_EXPIRED: "انتهت جلسة الدخول. سجّل الدخول مجددًا.",
  SESSION_NOT_FRESH: "لأمانك، سجّل الدخول من جديد ثم أعد المحاولة.",
  INVALID_ORIGIN: "تعذّر التحقق من مصدر الطلب. حدّث الصفحة وحاول مجددًا.",
  // Google (the ?error= of the page Google sends you back to)
  // (Better Auth 1.7: an error's words joined by "_", or OAUTH_CALLBACK_ERROR_CODES)
  signup_disabled: "لا يوجد حساب في menuPilot بهذا البريد. أنشئ حساب مطعمك أولًا، أو اطلب من صاحب المطعم إضافتك.",
  account_not_linked: "تعذّر ربط حساب Google بهذا الحساب. سجّل الدخول بكلمة المرور ثم اربطه من صفحة الأمان.",
  unable_to_link_account: "تعذّر ربط حساب Google بهذا الحساب. سجّل الدخول بكلمة المرور ثم اربطه من صفحة الأمان.",
  email_does_not_match: "بريد حساب Google لا يطابق بريد حسابك في menuPilot.",
  account_already_linked_to_different_user: "حساب Google هذا مرتبط بحساب آخر في menuPilot.",
  email_not_verified: "بريد حساب Google هذا غير مؤكَّد لدى Google.",
  email_not_found: "لم يعطِنا Google بريد هذا الحساب. اختر حسابًا آخر.",
  state_mismatch: "انتهت محاولة الدخول بحساب Google. حاول مجددًا.",
  invalid_code: "انتهت محاولة الدخول بحساب Google. حاول مجددًا.",
  access_denied: "تم إلغاء الدخول بحساب Google.",
};
// Codes whose server message (Arabic, translated in en.js) says it best.
const SERVER_WORDED = new Set(["ACCOUNT_LOCKED", "ACCOUNT_DISABLED", "WEAK_PASSWORD", "TWO_FACTOR_USE_PASSWORD", "CANNOT_UNLINK_PASSWORD"]);

export function authErrorMessage(code, serverMessage) {
  if (code && SERVER_WORDED.has(code) && serverMessage) return t(serverMessage);
  if (code && MESSAGES[code]) return t(MESSAGES[code]);
  return null;
}

function toError(error) {
  const status = error?.status ?? 0;
  const code = error?.code || null;
  const message = authErrorMessage(code, error?.message)
    || (status === 429 ? t("محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.") : null)
    || (status === 0 ? t("تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مجددًا.") : t("حدث خطأ غير متوقع. حاول مجددًا."));
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.friendly = true;
  return err;
}

/** Runs one Better Auth client method (`method(client)`); returns its data or throws a friendly Error. */
async function call(method) {
  let result;
  try {
    result = await method(await authClient());
  } catch (cause) {
    throw toError({ status: 0, cause });
  }
  if (result?.error) throw toError(result.error);
  return result?.data ?? null;
}

/* ---- what this deployment offers (e-mail, Google) -------------------------- */
let configPromise = null;
const OFF = { emailEnabled: false, googleEnabled: false, emailVerificationRequired: false };
export function getAuthConfig() {
  if (USE_MOCKS) return Promise.resolve(OFF);
  configPromise ??= fetch("/api/auth-config", { headers: { Accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : OFF))
    .catch(() => { configPromise = null; return OFF; });
  return configPromise;
}

/* ---- who is signed in (Laravel: role, permissions, restaurant…) ------------ */
export const fetchCurrentUser = () => api.get("/account/me");

/* ---- sign in -------------------------------------------------------------- */
/** {user} once signed in, or {twoFactor: true} when a code from the app is needed next. */
export async function login({ email, password }) {
  if (USE_MOCKS) {
    const data = await api.post("/account/login", { email, password });
    if (data?.token) setToken(data.token);
    return data;
  }
  setToken(null); // a demo token left on this device must not decide who this is
  const data = await call((c) => c.signIn.email({ email, password, rememberMe: true }));
  if (data?.twoFactorRedirect) return { twoFactor: true };
  return { user: await fetchCurrentUser() };
}

/** The second step: a code from the authenticator app, or one of the backup codes. */
export async function verifyTwoFactor({ code, backup = false, trustDevice = false }) {
  const clean = String(code).replace(/\s+/g, "");
  await call((c) => (backup
    ? c.twoFactor.verifyBackupCode({ code: clean, trustDevice })
    : c.twoFactor.verifyTotp({ code: clean, trustDevice })));
  return { user: await fetchCurrentUser() };
}

/** Leaves for Google; comes back to /login (which then opens the right dashboard). */
export async function loginWithGoogle(errorCallbackURL = "/login") {
  setToken(null);
  await call((c) => c.signIn.social({ provider: "google", callbackURL: "/login?google=1", errorCallbackURL }));
}

export const googleRegistrationInfo = () => call((c) => c.$fetch("/google-registration"));
export async function completeGoogleRegistration({ restaurantName, restaurantType, csrf }) {
  const response = await fetch("/api/account/register/google", {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", "X-Google-Registration": csrf },
    body: JSON.stringify({ restaurant_name: restaurantName, restaurant_type: restaurantType }),
  });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 409
    ? t("انتهت مهلة التسجيل. حاول باستخدام Google مجددًا.") : t("تعذر إنشاء الحساب. حاول مرة أخرى."));
  await call((c) => c.$fetch("/google-registration/session", { method: "POST", body: {} }));
}

/* ---- register (Laravel creates the restaurant and its trial) --------------- */
/** {user} when signed in right away, or {verifyEmail: true} when the e-mail must be confirmed first. */
export async function register(payload) {
  const body = {
    restaurant_name: payload.restaurantName, email: payload.email, password: payload.password,
    password_confirmation: payload.passwordConfirmation, plan: payload.plan,
  };
  if (USE_MOCKS) {
    const data = await api.post("/account/register", body);
    if (data?.token) setToken(data.token);
    return data;
  }
  await api.post("/account/register", body);
  const config = await getAuthConfig();
  if (config.emailVerificationRequired) {
    await call((c) => c.sendVerificationEmail({ email: payload.email, callbackURL: "/login?verified=1" })).catch(() => {});
    return { verifyEmail: true };
  }
  return login({ email: payload.email, password: payload.password });
}

export async function resendVerification(email) {
  await call((c) => c.sendVerificationEmail({ email, callbackURL: "/login?verified=1" }));
}

/* ---- sign out --------------------------------------------------------------- */
export async function logout() {
  try {
    if (USE_MOCKS || getToken()) await api.post("/account/logout").catch(() => {});
    else await (await authClient()).signOut();
  } finally {
    setToken(null); // also clears what this device saved for offline use
  }
}

/* ---- forgotten password ------------------------------------------------------ */
/** By e-mail when this deployment sends e-mail; otherwise the request goes to the platform team (WhatsApp). */
export async function forgotPassword({ email }) {
  const config = await getAuthConfig();
  if (config.emailEnabled) {
    await call((c) => c.requestPasswordReset({ email, redirectTo: "/reset-password" }));
    return { via: "email" };
  }
  await api.post("/account/forgot-password", { email });
  return { via: "whatsapp" };
}

/** A link with ?email= comes from the platform team (Laravel); without it, from the e-mail. */
export async function resetPassword({ token, email, password, passwordConfirmation }) {
  if (email || USE_MOCKS) {
    return api.post("/account/reset-password", { token, email, password, password_confirmation: passwordConfirmation });
  }
  return call((c) => c.resetPassword({ token, newPassword: password }));
}

/* ---- the Security page --------------------------------------------------------- */
export const changePassword = ({ currentPassword, newPassword, revokeOtherSessions = true }) =>
  call((c) => c.changePassword({ currentPassword, newPassword, revokeOtherSessions }));

export const listDevices = () => call((c) => c.listSessions());
export const revokeDevice = (id) => call((c) => c.$fetch("/revoke-device", { method: "POST", body: { id } }));
export const revokeOtherDevices = () => call((c) => c.revokeOtherSessions());

export const listLinkedAccounts = () => call((c) => c.listAccounts());
export const linkGoogle = () => call((c) => c.linkSocial({ provider: "google", callbackURL: "/account/security?linked=google", errorCallbackURL: "/account/security" }));
export const unlinkGoogle = () => call((c) => c.unlinkAccount({ providerId: "google" }));

/** Step 1: {totpURI, backupCodes}. Two-step sign-in is on once confirmTwoFactor() accepts a code. */
export const startTwoFactor = (password) => call((c) => c.twoFactor.enable({ password, issuer: "menuPilot" }));
export const confirmTwoFactor = (code) => call((c) => c.twoFactor.verifyTotp({ code: String(code).replace(/\s+/g, "") }));
export const disableTwoFactor = (password) => call((c) => c.twoFactor.disable({ password }));
export const newBackupCodes = (password) => call((c) => c.twoFactor.generateBackupCodes({ password }));
