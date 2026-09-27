/* ==========================================================================
   Alert.jsx — inline message with an optional recovery action.
   tone: info | success | warning | danger. Errors use role="alert" so they
   are announced; the rest use role="status".
   ========================================================================== */
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

const TONES = {
  info: { box: "border-info/20 bg-info/[0.07] text-info", icon: Info },
  success: { box: "border-herb/25 bg-herb/[0.08] text-herb", icon: CheckCircle2 },
  warning: { box: "border-copper/30 bg-copper/[0.08] text-copper-ink", icon: AlertTriangle },
  danger: { box: "border-brick/25 bg-brick/[0.07] text-brick", icon: AlertCircle },
};

export default function Alert({ tone = "info", title, children, action, onDismiss, className = "" }) {
  const { box, icon: Icon } = TONES[tone] || TONES.info;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-[var(--radius-card)] border p-3.5 text-sm animate-fade-in ${box} ${className}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={title ? "mt-0.5 text-ink-soft" : "font-medium"}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="-m-1 rounded-lg p-1 opacity-70 hover:opacity-100" aria-label="إخفاء الرسالة">
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
