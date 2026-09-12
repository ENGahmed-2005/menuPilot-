/* ==========================================================================
   auth.js — تسجيل الدخول / إنشاء حساب / تسجيل الخروج لصاحب المطعم
   يغطي: FR-01, FR-02, FR-03
   ========================================================================== */
import { api, setToken } from "./client";

/**
 * تسجيل مطعم جديد (Owner).
 * @param {{ restaurantName: string, email: string, password: string, passwordConfirmation: string }} payload
 */
export async function register(payload) {
  const data = await api.post("/auth/register", {
    restaurant_name: payload.restaurantName,
    email: payload.email,
    password: payload.password,
    password_confirmation: payload.passwordConfirmation,
    // بدونها، اختيار الباقة في خطوة التسجيل (Register.jsx) كان بيتحذف قبل
    // ما يوصل للـ mock، وكل حساب جديد كان يتسجّل على "basic" حتى لو المستخدم
    // اختار Premium فعليًا.
    plan: payload.plan,
  });

  if (data?.token) setToken(data.token);
  return data;
}

/**
 * تسجيل الدخول. FR-02.
 * @param {{ email: string, password: string }} payload
 */
export async function login(payload) {
  const data = await api.post("/auth/login", {
    email: payload.email,
    password: payload.password,
  });

  if (data?.token) setToken(data.token);
  return data;
}

/** تسجيل الخروج. FR-03. */
export async function logout() {
  try {
    await api.post("/auth/logout");
  } finally {
    // نمسح التوكن محليًا دائمًا، حتى لو فشل طلب السيرفر (مثلاً انقطع الاتصال).
    setToken(null);
  }
}

/** جلب بيانات المستخدم الحالي (للتحقق من صلاحية الجلسة عند فتح التطبيق). */
export async function fetchCurrentUser() {
  return api.get("/auth/me");
}

/**
 * طلب رابط استرجاع كلمة المرور. يُرسل دائمًا رسالة نجاح عامة (بغض النظر عن
 * وجود الإيميل من عدمه) — ممارسة أمان قياسية لمنع تسريب قائمة الحسابات
 * المسجّلة (user enumeration).
 * @param {{ email: string }} payload
 */
export async function forgotPassword(payload) {
  return api.post("/auth/forgot-password", { email: payload.email });
}

/**
 * تعيين كلمة مرور جديدة عبر التوكن المرسل بالبريد الإلكتروني.
 * @param {{ token: string, email: string, password: string, passwordConfirmation: string }} payload
 */
export async function resetPassword(payload) {
  return api.post("/auth/reset-password", {
    token: payload.token,
    email: payload.email,
    password: payload.password,
    password_confirmation: payload.passwordConfirmation,
  });
}
