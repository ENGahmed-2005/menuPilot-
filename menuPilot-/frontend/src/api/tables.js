/* ==========================================================================
   tables.js — إدارة طاولات المطعم + توليد رمز QR
   يغطي: FR-04 (إضافة), FR-05 (تعديل), FR-06 (حذف), FR-07 (توليد QR تلقائي)
   ========================================================================== */
import { api } from "./client";

export const getTables = () => api.get("/tables");

export const createTable = (payload) =>
  // مثال payload: { label: "Table 07", seats: 4 }
  // الـ backend مسؤول عن توليد رمز QR فريد تلقائيًا (FR-07) ويعيده ضمن الاستجابة.
  api.post("/tables", payload);

export const updateTable = (tableId, payload) => api.put(`/tables/${tableId}`, payload);

export const deleteTable = (tableId) => api.delete(`/tables/${tableId}`);

/** حالة الطاولة (Available / Occupied) — تُستخدم بلوحة الكاشير والنادل. FR-32. */
export const getTableStatus = (tableId) => api.get(`/tables/${tableId}/status`);
