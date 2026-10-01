/* ==========================================================================
   subscription.js — the restaurant's plan and bank-transfer payments.
   Prices, dates and status always come from the API.
   ========================================================================== */
import { api } from "./client";

/** State, plans + prices, Bank of Palestine details, WhatsApp, my payments. */
export const getSubscription = () => api.get("/subscription");

/** "I have transferred": creates a pending payment + returns whatsapp_url. */
export const reportTransfer = (payload) => api.post("/subscription/payments", payload);

/** Legacy: records the chosen plan (+ add-ons) as a request (no activation without payment). */
export async function changePlan(planId, addons) {
  return api.patch("/me/plan", addons ? { plan: planId, addons } : { plan: planId });
}

// Platform admin
export const getSubscriptionPayments = (status = "pending") => api.get(`/admin/subscription-payments?status=${status}`);
export const verifySubscriptionPayment = (id) => api.post(`/admin/subscription-payments/${id}/verify`);
export const rejectSubscriptionPayment = (id, reason) => api.post(`/admin/subscription-payments/${id}/reject`, { reason });
