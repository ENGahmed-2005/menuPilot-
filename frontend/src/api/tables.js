/* ========================================================================
   tables.js — إدارة طاولات المطعم + QR
   يغطي: FR-04 (إضافة), FR-05 (تعديل), FR-06 (حذف), FR-07 (QR تلقائي)
   ======================================================================== */
import { api } from "./client";

export const getTables = () => api.get("/tables");

export const createTable = (payload) => api.post("/tables", payload);

export const updateTable = (tableId, payload) => api.put(`/tables/${tableId}`, payload);

export const deleteTable = (tableId) => api.delete(`/tables/${tableId}`);

/** Backend-owned QR endpoint required by Sprint 1 / US-05. */
export const getTableQr = (tableId) => api.get(`/tables/${tableId}/qr`);

/** حالة الطاولة (Available / Occupied) — تُستخدم بلوحة الكاشير والنادل. FR-32. */
export const getTableStatus = (tableId) => api.get(`/tables/${tableId}/status`);
