/* ==========================================================================
   billing.js — طلب الفاتورة، تسجيل الدفع، إغلاق الجلسة
   يغطي: FR-27..32, FR-36, FR-37
   ========================================================================== */
import { api } from "./client";

/** الزبون يطلب الفاتورة من هاتفه. FR-27 (وFR-28 يخص إشعار الطاقم من طرف السيرفر). */
export const requestBill = (sessionId) => api.post(`/public/sessions/${sessionId}/bill-request`);

/** الفاتورة المجمّعة لكل طلبات الجلسة. FR-29. */
export const getBill = (sessionId) => api.get(`/sessions/${sessionId}/bill`);

/**
 * تسجيل الدفع وإغلاق الجلسة. FR-30, FR-31, FR-32 (تحرير الطاولة يتم في الـ backend).
 * @param {"cash" | "electronic" | "ussd"} method - FR-30 وFR-37 (USSD كقناة بديلة أوفلاين)
 */
export const recordPayment = (sessionId, method) =>
  api.post(`/sessions/${sessionId}/payment`, { method });

/**
 * تعديل يدوي على سعر/قيمة صنف بالفاتورة من الكاشير — يسجّل القيمة الأصلية
 * والمعدَّلة وهوية الكاشير والطابع الزمني تلقائيًا في الـ backend. FR-36.
 */
export const adjustBillItem = (sessionId, billItemId, payload) =>
  api.patch(`/sessions/${sessionId}/bill-items/${billItemId}`, payload);

/** Close a session once payment is recorded; the table returns to Available. FR-31, FR-32. */
export const closeSession = (sessionId) => api.post(`/sessions/${sessionId}/close`);

/** Mark an offline/USSD payment as reconciled after connectivity returns. FR-37. */
export const reconcilePayment = (paymentId) => api.post(`/payments/${paymentId}/reconcile`);
