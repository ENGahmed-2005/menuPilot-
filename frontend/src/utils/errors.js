import { t } from "../i18n";
/* ==========================================================================
   errors.js — user-facing error messages.
   The API returns Arabic, actionable messages for business rules (4xx), and
   those are shown as-is. Transport and server failures (network down, 5xx,
   raw framework messages) are replaced with plain guidance instead of
   "Request failed: 500".
   ========================================================================== */

const BY_STATUS = {
  401: t("انتهت جلستك. سجّل الدخول مرة أخرى للمتابعة."),
  403: t("ليست لديك صلاحية لتنفيذ هذا الإجراء."),
  404: t("لم نعثر على ما تبحث عنه. ربما تم حذفه أو إغلاقه."),
  408: t("استغرق الطلب وقتًا أطول من المتوقع. حاول مرة أخرى."),
  409: t("تم تحديث هذه البيانات من مكان آخر. حدّث الصفحة وحاول مجددًا."),
  413: t("الملف كبير جدًا. اختر ملفًا أصغر."),
  419: t("انتهت صلاحية الصفحة. حدّثها وحاول مرة أخرى."),
  422: t("بعض البيانات غير صحيحة. راجع الحقول المحددة."),
  429: t("محاولات كثيرة خلال وقت قصير. انتظر دقيقة ثم حاول مجددًا."),
};

export const NETWORK_MESSAGE = t("تعذّر الاتصال بالخادم. تحقق من الإنترنت ثم حاول مرة أخرى.");
export const SERVER_MESSAGE = t("حدث خطأ في الخادم. حاول مرة أخرى بعد قليل.");

// Framework / transport messages that should never reach end users.
const RAW = /^(server error|internal server error|request failed|unauthenticated\.?|too many attempts|sqlstate|failed to fetch|networkerror|load failed|the given data was invalid)/i;

export function friendlyMessage(status, serverMessage) {
  if (!status) return NETWORK_MESSAGE;
  if (status >= 500) return SERVER_MESSAGE;
  // Server messages are Arabic; t() gives their English when the app is in English.
  if (serverMessage && !RAW.test(serverMessage.trim())) return t(serverMessage.trim());
  return BY_STATUS[status] || t("تعذّر إتمام العملية. حاول مرة أخرى.");
}

/** Message for any caught error (API error, network TypeError, or unknown). */
export function errorText(error, fallback = t("تعذّر إتمام العملية. حاول مرة أخرى.")) {
  if (!error) return fallback;
  if (error.friendly) return error.message;
  if (error.name === "TypeError") return NETWORK_MESSAGE;
  return error.message && !RAW.test(error.message) ? error.message : fallback;
}
