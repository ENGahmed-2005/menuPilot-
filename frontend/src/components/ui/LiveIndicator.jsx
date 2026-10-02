import { t } from "../../i18n";
/* ==========================================================================
   LiveIndicator.jsx — tells staff whether the screen is updating by itself.
   Text + dot (never colour alone); politely announced when it changes.
   ========================================================================== */
export default function LiveIndicator({ connected = true, label }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2 text-xs font-bold text-muted">
      <span className="relative flex h-2.5 w-2.5">
        {connected && <span className="absolute inset-0 animate-ping rounded-full bg-herb/60 motion-reduce:hidden" />}
        <span className={`relative h-2.5 w-2.5 rounded-full ${connected ? "bg-herb" : "bg-brick"}`} />
      </span>
      {label || (connected ? t("تحديث تلقائي") : t("انقطع الاتصال، جارٍ إعادة المحاولة…"))}
    </span>
  );
}
