import { getToken } from "./client";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const getPaymentOptions = (sessionId) =>
  fetch(`${BASE_URL}/public/sessions/${sessionId}/payment-options`, { headers: { Accept: "application/json" } })
    .then(async (response) => {
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || `Request failed: ${response.status}`);
      return data?.data ?? data;
    });

export async function submitPayment(sessionId, payload) {
  const form = new FormData();
  form.append("items", JSON.stringify(payload.items));
  form.append("method", payload.method);
  form.append("payer_name", payload.payer_name);
  form.append("payer_phone", payload.payer_phone);
  if (payload.provider) form.append("provider", payload.provider);
  if (payload.proof) form.append("proof", payload.proof);

  const response = await fetch(`${BASE_URL}/public/sessions/${sessionId}/payment`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: form,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || `Request failed: ${response.status}`);
    error.status = response.status;
    error.errors = data?.errors || null;
    throw error;
  }
  return data?.data ?? data;
}

export const getPendingPayments = () =>
  fetch(`${BASE_URL}/payments/pending`, { headers: { Accept: "application/json", Authorization: `Bearer ${getToken()}` } })
    .then(async (response) => {
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || `Request failed: ${response.status}`);
      return data?.data ?? data;
    });

export const verifyPayment = (paymentId) =>
  fetch(`${BASE_URL}/payments/${paymentId}/verify`, { method: "POST", headers: { Accept: "application/json", Authorization: `Bearer ${getToken()}` } })
    .then(async (response) => {
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || `Request failed: ${response.status}`);
      return data?.data ?? data;
    });

export const rejectPayment = (paymentId, reason) =>
  fetch(`${BASE_URL}/payments/${paymentId}/reject`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ reason }),
  }).then(async (response) => {
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || `Request failed: ${response.status}`);
    return data?.data ?? data;
  });
