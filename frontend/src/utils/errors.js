/* ==========================================================================
   errors.js — user-facing error messages.
   The API returns Arabic, actionable messages for business rules (4xx), and
   those are shown as-is. Transport and server failures (network down, 5xx,
   raw framework messages) are replaced with plain guidance instead of
   "Request failed: 500".
   ========================================================================== */

const BY_STATUS = {
  401: "انتهت جلستك. سجّل الدخول مرة أخرى للمتابعة.",
  403: "ليست لديك صلاحية لتنفيذ هذا الإجراء.",
  404: "لم نعثر على ما تبحث عنه. ربما تم حذفه أو إغلاقه.",
  408: "استغرق الطلب وقتًا أطول من المتوقع. حاول مرة أخرى.",
  409: "تم تحديث هذه البيانات من مكان آخر. حدّث الصفحة وحاول مجددًا.",
  413: "الملف كبير جدًا. اختر ملفًا أصغر.",
  419: "انتهت صلاحية الصفحة. حدّثها وحاول مرة أخرى.",
  422: "بعض البيانات غير صحيحة. راجع الحقول المحددة.",
  429: "محاولات كثيرة خلال وقت قصير. انتظر دقيقة ثم حاول مجددًا.",
};

export const NETWORK_MESSAGE = "تعذّر الاتصال بالخادم. تحقق من الإنترنت ثم حاول مرة أخرى.";
export const SERVER_MESSAGE = "حدث خطأ في الخادم. حاول مرة أخرى بعد قليل.";

// Framework / transport messages that should never reach end users.
const RAW = /^(server error|internal server error|request failed|unauthenticated\.?|too many attempts|sqlstate|failed to fetch|networkerror|load failed|the given data was invalid)/i;

export function friendlyMessage(status, serverMessage) {
  if (!status) return NETWORK_MESSAGE;
  if (status >= 500) return SERVER_MESSAGE;
  if (serverMessage && !RAW.test(serverMessage.trim())) return serverMessage;
  return BY_STATUS[status] || "تعذّر إتمام العملية. حاول مرة أخرى.";
}

/** Message for any caught error (API error, network TypeError, or unknown). */
export function errorText(error, fallback = "تعذّر إتمام العملية. حاول مرة أخرى.") {
  if (!error) return fallback;
  if (error.friendly) return error.message;
  if (error.name === "TypeError") return NETWORK_MESSAGE;
  return error.message && !RAW.test(error.message) ? error.message : fallback;
}
