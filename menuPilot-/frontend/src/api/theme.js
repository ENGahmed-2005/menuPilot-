/* ==========================================================================
   theme.js — حفظ/جلب ثيم لوحة تحكم المطعم (تخصيص حسب باقة الاشتراك)
   ========================================================================== */
import { api } from "./client";

/**
 * حفظ الثيم المختار لحساب الـ owner الحالي.
 * @param {{ preset: string, colors?: {primary:string,secondary:string,background:string} }} theme
 *   preset: معرّف ثيم جاهز (مثل "forest")، أو "custom" لو الألوان مخصّصة يدويًا.
 *   colors: مطلوبة فقط لو preset === "custom".
 */
export async function saveTheme(theme) {
  return api.patch("/me/theme", { theme });
}
