/* ==========================================================================
   formatDateTime.js — تنسيق التواريخ والأوقات (طوابع زمنية للطلبات FR-23،
   وقت الإرسال بلوحة المطبخ FR-38، إلخ)
   ========================================================================== */
export function formatDateTime(isoString, locale = "en-US") {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}

export function formatTime(isoString, locale = "en-US") {
  return new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(new Date(isoString));
}
