/* ==========================================================================
   orders.js — سلة الزبون، إرسال الطلب، لوحة المطبخ، تتبع الحالة
   يغطي: FR-12..21, FR-33, FR-34, FR-38, FR-39
   ========================================================================== */
import { api } from "./client";

/**
 * إرسال طلب ضمن جلسة نشطة. FR-12..16.
 * @param {string} sessionId
 * @param {{ menuItemId: string, quantity: number, note?: string }[]} items - FR-13, FR-14
 */
export const submitOrder = (sessionId, items) =>
  api.post(`/public/sessions/${sessionId}/orders`, { items });

/** تتبع حالة الطلبات ضمن الجلسة — تحديث حي بدون تسجيل دخول. FR-20. */
export const getSessionOrders = (sessionId) => api.get(`/public/sessions/${sessionId}/orders`);

/**
 * لوحة المطبخ: الطلبات الواردة.
 * FR-38: مدة انقضاء لكل طلب. FR-39: الفرز حسب وقت التحضير المتوقع.
 * @param {{ sortBy?: "prepTime" | "submittedAt" }} params
 */
export const getKitchenOrders = (params = {}) =>
  api.get(`/kitchen/orders${params.sortBy ? `?sort_by=${params.sortBy}` : ""}`);

/** تحديث حالة الطلب: Pending → Preparing → Ready → Served. FR-19. */
export const updateOrderStatus = (orderId, status) =>
  api.patch(`/kitchen/orders/${orderId}/status`, { status });

/**
 * إلغاء/تعديل صنف بعد إرساله للمطبخ — يتطلب سببًا إلزاميًا. FR-34.
 * @param {string} orderItemId
 * @param {{ reason: string }} payload
 */
export const cancelOrderItem = (orderItemId, payload) =>
  api.post(`/order-items/${orderItemId}/cancel`, payload);

/** إعادة تخصيص صنف ملغي لجلسة تانية بدل رميه. FR-33. */
export const reassignOrderItem = (orderItemId, targetSessionId) =>
  api.post(`/order-items/${orderItemId}/reassign`, { target_session_id: targetSessionId });

/** لوحة صاحب المطعم: الطلبات الحالية والسابقة. FR-21. */
export const getOwnerOrders = (filters = {}) => {
  const qs = new URLSearchParams(filters).toString();
  return api.get(`/owner/orders${qs ? `?${qs}` : ""}`);
};
