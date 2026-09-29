/* ==========================================================================
   whatsapp.js — international WhatsApp numbers and wa.me links.
   Numbers are stored as +<country code><number> (E.164), e.g. +970599123456.
   ========================================================================== */
export const COUNTRY_CODES = [
  ["+970", "فلسطين"], ["+972", "فلسطين (جوال 972)"], ["+962", "الأردن"], ["+20", "مصر"], ["+966", "السعودية"],
  ["+971", "الإمارات"], ["+974", "قطر"], ["+965", "الكويت"], ["+973", "البحرين"], ["+968", "عُمان"],
  ["+961", "لبنان"], ["+963", "سوريا"], ["+964", "العراق"], ["+90", "تركيا"], ["+44", "بريطانيا"], ["+1", "أمريكا/كندا"],
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
