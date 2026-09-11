/* ==========================================================================
   menu.js — إدارة القائمة (Owner) + عرضها للزبون عبر QR
   ========================================================================== */
import { api } from "./client";

export const getMenuItems = () => api.get("/menu-items");

export const createMenuItem = (payload) => api.post("/menu-items", payload);

export const updateMenuItem = (itemId, payload) =>
  api.put(`/menu-items/${itemId}`, payload);

export const deleteMenuItem = (itemId) => api.delete(`/menu-items/${itemId}`);

/**
 * Laravel يرجع القائمة العامة بالشكل { table, items } داخل data.
 * صفحة العميل تحتاج مصفوفة items فقط، مع توحيد اسم صورة الصنف.
 */
export const getPublicMenuByTableCode = async (tableCode) => {
  const response = await api.get(
    `/public/tables/${encodeURIComponent(tableCode)}/menu`
  );

  const items = Array.isArray(response) ? response : response?.items || [];

  return items.map((item) => ({
    ...item,
    imageUrl: item.imageUrl ?? item.image_url ?? null,
  }));
};
