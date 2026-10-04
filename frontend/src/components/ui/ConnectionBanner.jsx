/* ==========================================================================
   ConnectionBanner.jsx — tells staff what the screen is showing and doing
   while the connection is bad: saved data (offline), changes waiting to be
   sent, changes the server refused (retry or dismiss), and a new app version.
   Text + icon, never colour alone; announced politely. Mounted once in App.jsx.
   ========================================================================== */
import { useEffect, useState } from "react";
import { AlertTriangle, CloudUpload, RefreshCw, WifiOff } from "lucide-react";
import { useConnectivity } from "../../offline/connectivity";
import { dismiss, retry, useOutbox } from "../../offline/outbox";
import { applyUpdate, onUpdateWaiting, updateWaiting } from "../../offline/register";
import { formatTime } from "../../utils/formatDateTime";
import { countAr, AR } from "../../utils/plural";
import { locale, t } from "../../i18n";

const pill = "pointer-events-auto flex max-w-xl items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm font-bold text-paper shadow-lg";

export default function ConnectionBanner() {
  const { online, savedAt } = useConnectivity();
  const { pending, failed, syncing } = useOutbox();
  const [update, setUpdate] = useState(updateWaiting);
  useEffect(() => onUpdateWaiting(setUpdate), []);

  if (online && !update && !pending.length && !failed.length) return null;

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-[80] flex flex-col items-center gap-2">
      {!online && (
        <div className={`${pill} bg-brick`}>
          <WifiOff size={18} aria-hidden="true" className="shrink-0" />
          <span>
            {t("لا يوجد اتصال بالإنترنت — تعرض الشاشة آخر بيانات محفوظة.")}
            {savedAt ? ` ${t("آخر تحديث: {0}", { 0: formatTime(savedAt, locale) })}` : ""}
          </span>
        </div>
      )}
      {pending.length > 0 && (
        <div className={`${pill} bg-navy`}>
          <CloudUpload size={18} aria-hidden="true" className="shrink-0 text-copper" />
          <span>
            {online || syncing
              ? t("جارٍ إرسال {0} إلى الخادم…", { 0: countAr(pending.length, AR.operations) })
              : t("{0} محفوظة على هذا الجهاز وستُرسل عند عودة الإنترنت.", { 0: countAr(pending.length, AR.operations) })}
          </span>
        </div>
      )}
      {failed.length > 0 && (
        <div className={`${pill} flex-col items-stretch bg-brick`}>
          <p className="flex items-center gap-2"><AlertTriangle size={18} aria-hidden="true" className="shrink-0" />{t("تعذّر إرسال بعض العمليات المحفوظة:")}</p>
          <ul className="space-y-2">
            {failed.slice(0, 3).map((op) => (
              <li key={op.key} className="rounded-xl bg-black/15 p-2.5 font-medium">
                <p className="font-bold">{op.label}</p>
                <p className="text-xs opacity-90">{op.error}</p>
                <div className="mt-1.5 flex gap-2">
                  <button type="button" onClick={() => retry(op.key)} className="rounded-lg bg-paper px-2.5 py-1 text-xs font-bold text-brick">{t("إعادة المحاولة")}</button>
                  <button type="button" onClick={() => dismiss(op.key)} className="rounded-lg border border-paper/60 px-2.5 py-1 text-xs font-bold">{t("إخفاء")}</button>
                </div>
              </li>
            ))}
          </ul>
          {failed.length > 3 && <p className="text-xs">{t("و{0} أخرى.", { 0: failed.length - 3 })}</p>}
        </div>
      )}
      {update && (
        <div className={`${pill} gap-3 bg-navy`}>
          <span>{t("يتوفر إصدار جديد من التطبيق.")}</span>
          <button type="button" onClick={() => applyUpdate()} className="inline-flex items-center gap-1.5 rounded-xl bg-copper px-3 py-1.5 text-navy-deep">
            <RefreshCw size={14} aria-hidden="true" /> {t("تحديث الآن")}
          </button>
        </div>
      )}
    </div>
  );
}
