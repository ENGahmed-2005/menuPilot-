/* ==========================================================================
   menu.js — إدارة القائمة (Owner) + عرضها للزبون عبر QR
   يغطي: FR-08 (إضافة), FR-09 (تعديل), FR-10 (حذف), FR-11 (عرض حسب الطاولة)
   ========================================================================== */
import { api } from "./client";

/** لوحة الإدارة: كل أصناف القائمة الخاصة بمطعم صاحب الحساب الحالي. */
export const getMenuItems = () => api.get("/menu-items");

export const createMenuItem = (payload) =>
  // مثال payload: { name, price, category, description, imageUrl }
  api.post("/menu-items", payload);

export const updateMenuItem = (itemId, payload) => api.put(`/menu-items/${itemId}`, payload);

export const deleteMenuItem = (itemId) => api.delete(`/menu-items/${itemId}`);

/**
 * القائمة العامة للزبون بعد مسح رمز QR — بدون تسجيل دخول.
 * FR-11: يجب أن تعرض قائمة المطعم/الفرع/الطاولة الصحيحة حسب رمز الطاولة.
 * @param {string} tableCode - الرمز المُشفَّر داخل QR (وليس معرّف الطاولة الداخلي).
 */
export const getPublicMenuByTableCode = (tableCode) => api.get(`/public/tables/${tableCode}/menu`);
