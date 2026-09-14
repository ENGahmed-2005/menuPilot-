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
 * Laravel يرجع { table, restaurant, items } داخل data.
 * نوحّد شكل الأصناف مع واجهة React ونمرّر بيانات المطعم والهوية
 * حتى يتم تطبيق تخصيص المالك على منيو الزبون.
 */
export const getPublicMenuByTableCode = async (tableCode) => {
  const response = await api.get(
    `/public/tables/${encodeURIComponent(tableCode)}/menu`
  );

  const isArrayResponse = Array.isArray(response);
  const items = isArrayResponse ? response : response?.items || [];

  return {
    table: isArrayResponse ? null : response?.table || null,
    restaurant: isArrayResponse ? null : response?.restaurant || null,
    items: items.map((item) => ({
      ...item,
      imageUrl: item.imageUrl ?? item.image_url ?? null,
    })),
  };
};
