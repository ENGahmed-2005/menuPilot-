/* What to tell a guest when a table session can't be opened. */
import { t } from "../i18n";

export function openSessionError(err) {
  if (err?.code === "RESTAURANT_LOCATION_NOT_CONFIGURED") return t("المطعم لم يحدد موقعه بعد. يجب على صاحب المطعم ضبط موقع المطعم من الإعدادات قبل استقبال طلبات QR.");
  if (err?.code === "LOCATION_SECURE_CONTEXT_REQUIRED") return err.message;
  // Server messages are Arabic; t() gives their English when the app is in English.
  if (err?.code === "LOCATION_REQUIRED" || err?.status === 403) return err.message ? t(err.message) : t("يجب السماح بتحديد موقعك وأن تكون داخل المطعم لفتح هذه الطاولة.");
  if (err?.code === "TABLE_UNAVAILABLE") return t(err.message);
  if (err?.status === 409 || err?.code === "TABLE_ALREADY_OCCUPIED") return t("هذه الطاولة مستخدمة حاليًا. اطلب مساعدة أحد أفراد الطاقم للمتابعة.");
  if (err?.status === 404) return t("رمز QR غير صالح أو أن هذه الطاولة لم تعد موجودة.");
  return err?.message || t("تعذر بدء الجلسة. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.");
}
