/* ==========================================================================
   ConnectionBanner.jsx — tells staff when the screen is showing saved data
   (offline) and when a new version of the app is waiting. Text + icon, never
   colour alone; announced politely. Mounted once in App.jsx.
   ========================================================================== */
import { useEffect, useState } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { useConnectivity } from "../../offline/connectivity";
import { applyUpdate, onUpdateWaiting, updateWaiting } from "../../offline/register";
import { formatTime } from "../../utils/formatDateTime";
import { locale, t } from "../../i18n";


export default function ConnectionBanner() {
  const { online, savedAt } = useConnectivity();
  const [update, setUpdate] = useState(updateWaiting);
  useEffect(() => onUpdateWaiting(setUpdate), []);

  if (online && !update) return null;

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-[80] flex flex-col items-center gap-2">
      {!online && (
        <div className="pointer-events-auto flex max-w-xl items-center gap-2.5 rounded-2xl bg-brick px-4 py-2.5 text-sm font-bold text-paper shadow-lg">
          <WifiOff size={18} aria-hidden="true" className="shrink-0" />
          <span>
            {t("لا يوجد اتصال بالإنترنت — تعرض الشاشة آخر بيانات محفوظة.")}
            {savedAt ? ` ${t("آخر تحديث: {0}", { 0: formatTime(savedAt, locale) })}` : ""}
          </span>
        </div>
      )}
      {update && (
        <div className="pointer-events-auto flex max-w-xl items-center gap-3 rounded-2xl bg-navy px-4 py-2.5 text-sm font-bold text-paper shadow-lg">
          <span>{t("يتوفر إصدار جديد من التطبيق.")}</span>
          <button type="button" onClick={() => applyUpdate()} className="inline-flex items-center gap-1.5 rounded-xl bg-copper px-3 py-1.5 text-navy-deep">
            <RefreshCw size={14} aria-hidden="true" /> {t("تحديث الآن")}
          </button>
        </div>
      )}
    </div>
  );
}
