/* ==========================================================================
   outsideOrders.js — ordering from outside the restaurant (pickup/delivery).
   Prices, fees and statuses are always computed by the API.
   ========================================================================== */
import { api } from "./client";
import { normalizeMenuItem } from "./menu";

// Public (customer). Dishes get the same shape as the table menu (imageUrl, options).
export const getOnlineRestaurant = async (slug) => {
  const data = await api.get(`/public/restaurants/${encodeURIComponent(slug)}`);
  return { ...data, items: (data?.items || []).map(normalizeMenuItem) };
};
export const placeOnlineOrder = (slug, payload) => api.post(`/public/restaurants/${encodeURIComponent(slug)}/orders`, payload);
export const trackOnlineOrder = (id, token) => api.get(`/public/outside-orders/${id}?token=${encodeURIComponent(token)}`);

// Staff
export const getOutsideOrders = (status = "active") => api.get(`/outside-orders?status=${status}`);
export const acceptOutsideOrder = (id, prepMinutes) => api.post(`/outside-orders/${id}/accept`, { prep_minutes: prepMinutes });
export const rejectOutsideOrder = (id, reason) => api.post(`/outside-orders/${id}/reject`, { reason });
export const dispatchOutsideOrder = (id) => api.post(`/outside-orders/${id}/dispatch`);
export const completeOutsideOrder = (id) => api.post(`/outside-orders/${id}/complete`);
export const verifyOutsidePayment = (id) => api.post(`/outside-orders/${id}/verify-payment`);

// Settings
export const getOnlineOrderingSettings = () => api.get("/online-ordering/settings");
export const saveOnlineOrderingSettings = (payload) => api.put("/online-ordering/settings", payload);

/** 0599… → 970599… for wa.me links (Palestine numbers). */
export const whatsappNumber = (phone) => String(phone || "").replace(/\D/g, "").replace(/^0/, "970");

// Delivery dispatch
export const getDrivers = () => api.get("/outside-orders/drivers");
export const assignDriver = (id, driverId) => api.post(`/outside-orders/${id}/assign`, { driver_id: driverId || null });

// Owner override of a delivery order's status
export const overrideOutsideStatus = (id, status, reason) => api.post(`/outside-orders/${id}/status`, { status, reason: reason || undefined });
