/* ==========================================================================
   Badge.jsx — compact label for a state or category.
   tone: neutral | success | warning | danger | info | brand
         (legacy alias: good → success)
   Pass an icon so state is never communicated by colour alone.
   ========================================================================== */
const TONES = {
  neutral: "bg-ink/[0.06] text-ink-soft ring-ink/10",
  success: "bg-herb/12 text-herb ring-herb/20",
  warning: "bg-copper/12 text-copper-ink ring-copper/25",
  danger: "bg-brick/10 text-brick ring-brick/20",
  info: "bg-info/10 text-info ring-info/20",
  brand: "bg-copper text-ink ring-transparent",
};
TONES.good = TONES.success;

export default function Badge({ tone = "neutral", icon: Icon, pulse = false, className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${TONES[tone] || TONES.neutral} ${className}`}
    >
      {Icon && <Icon size={13} strokeWidth={2.5} aria-hidden="true" className={pulse ? "animate-pulse-soft" : ""} />}
      {children}
    </span>
  );
}
