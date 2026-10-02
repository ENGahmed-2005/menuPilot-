import { t } from "../i18n";
/* ==========================================================================
   whatsapp.js — international WhatsApp numbers and wa.me links.
   Numbers are stored as +<country code><number> (E.164), e.g. +970599123456.
   ========================================================================== */
export const COUNTRY_CODES = [
  ["+970", t("فلسطين")], ["+972", t("فلسطين (جوال 972)")], ["+962", t("الأردن")], ["+20", t("مصر")], ["+966", t("السعودية")],
  ["+971", t("الإمارات")], ["+974", t("قطر")], ["+965", t("الكويت")], ["+973", t("البحرين")], ["+968", t("عُمان")],
  ["+961", t("لبنان")], ["+963", t("سوريا")], ["+964", t("العراق")], ["+90", t("تركيا")], ["+44", t("بريطانيا")], ["+1", t("أمريكا/كندا")],
];

/** "+970599123456" → { code: "+970", number: "599123456" } (longest matching code). */
export function splitE164(value) {
  const v = String(value || "");
  const code = [...COUNTRY_CODES].map(([c]) => c).sort((a, b) => b.length - a.length).find((c) => v.startsWith(c)) || "+970";
  return { code, number: v.startsWith(code) ? v.slice(code.length) : v.replace(/\D/g, "") };
}

/** Country code + local number (leading 0 and spaces removed) → E.164, or "" if empty. */
export function toE164(code, number) {
  const digits = String(number || "").replace(/\D/g, "").replace(/^0+/, "");
  return digits ? `${code}${digits}` : "";
}

/** wa.me link for an E.164 number with a pre-filled message. */
export const waLink = (e164, text = "") => `https://wa.me/${String(e164 || "").replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
