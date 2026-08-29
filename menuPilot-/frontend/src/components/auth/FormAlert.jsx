/* ==========================================================================
   FormAlert.jsx — بانر رسالة نجاح/خطأ موحّد داخل فورمات auth
   tone: "error" (افتراضي) | "success"
   ========================================================================== */
import { AlertCircle, CheckCircle2 } from "lucide-react";

const TONES = {
  error: { wrap: "bg-brick/10 text-brick", Icon: AlertCircle },
  success: { wrap: "bg-herb/10 text-herb", Icon: CheckCircle2 },
};

export default function FormAlert({ tone = "error", children }) {
  const { wrap, Icon } = TONES[tone];
  return (
    <p role="alert" className={`flex items-start gap-2 rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${wrap}`}>
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
