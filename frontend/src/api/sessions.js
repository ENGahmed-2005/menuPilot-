/* ==========================================================================
   sessions.js — دورة حياة "جلسة الطعام" (Dining Session)
   يغطي: FR-24, FR-25, FR-26, FR-41
   حسب الـ SRS القسم 1.10: كل مسح QR يفتح جلسة، وتظل مفتوحة حتى إغلاقها
   من الكاشير بعد تأكيد الدفع.
   حالات الجلسة (1.10.1):
   Opened → Ordering → Preparing → Ready → Served → Bill Requested →
   Payment Pending → Paid → Closed
   ========================================================================== */
import { api } from "./client";

/**
 * فتح جلسة جديدة بعد مسح QR. FR-24.
 * الـ backend يرفض الطلب (409 مثلاً) لو في جلسة نشطة أصلاً لنفس الطاولة (FR-26).
 * @param {{ tableCode: string, name: string, phone: string }} payload
 */
export const openSession = (payload) =>
  api.post(`/public/tables/${payload.tableCode}/sessions`, {
    name: payload.name,
    phone: payload.phone,
  });

/** جلب حالة الجلسة الحالية (لتحديث شاشة تتبع الطلب دون تسجيل دخول). */
export const getSession = (sessionId) => api.get(`/public/sessions/${sessionId}`);

/**
 * طلب مساعدة نادل بلمسة واحدة. FR-41.
 * الـ backend مسؤول عن منع التكرار طالما في طلب سابق غير محلول لنفس الجلسة.
 */
export const requestWaiterAssistance = (sessionId) =>
  api.post(`/public/sessions/${sessionId}/assistance-requests`);

/** لوحة النادل: كل الجلسات النشطة حاليًا عبر الطاولات. */
export const getActiveSessions = () => api.get("/sessions?status=active");
