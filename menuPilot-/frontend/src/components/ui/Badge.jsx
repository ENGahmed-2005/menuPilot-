/* ==========================================================================
   Badge.jsx — شارة صغيرة لعرض حالة (Order status, Table status...)
   tone: "neutral" (افتراضي) | "good" | "warning" | "danger"
   ========================================================================== */
const TONES = {
  neutral: "bg-ink/8 text-ink-soft",
  good: "bg-herb/15 text-herb",
  warning: "bg-copper/15 text-copper-deep",
  danger: "bg-brick/12 text-brick",
};

export default function Badge({ tone = "neutral", children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
