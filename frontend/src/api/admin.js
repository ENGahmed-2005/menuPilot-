/* ==========================================================================
   admin.js — عمليات مسؤول المنصة (System Admin) عبر كل المطاعم/المستأجرين
   ========================================================================== */
import { api } from "./client";

/** كل المطاعم المسجّلة على المنصة (owners) — مسؤول المنصة فقط. */
export async function getAllRestaurants() {
  return api.get("/admin/restaurants");
}

/** فرض تغيير باقة أي مطعم يدويًا — استخدام دعم فني (support override)، مش تدفق ترقية عادي. */
export async function overrideRestaurantPlan(restaurantId, planId) {
  return api.patch(`/admin/restaurants/${restaurantId}/plan`, { plan: planId });
}
