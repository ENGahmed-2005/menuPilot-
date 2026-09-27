/* ==========================================================================
   StatCard.jsx — KPI tile. When onClick is given it becomes a filter button
   (aria-pressed shows which filter is active).
   tone colours only the icon; the number stays high-contrast ink.
   ========================================================================== */
const TONES = {
  ink: "bg-ink/[0.07] text-ink",
  copper: "bg-copper/15 text-copper-ink",
  herb: "bg-herb/12 text-herb",
  brick: "bg-brick/10 text-brick",
  info: "bg-info/10 text-info",
};

export default function StatCard({ icon: Icon, label, value, hint, tone = "ink", onClick, active = false, emphasis = false }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={`flex w-full flex-col items-start gap-2 rounded-[var(--radius-card)] border bg-surface p-3 text-right shadow-[var(--shadow-card)] transition-colors sm:flex-row sm:items-center sm:gap-3.5 sm:p-4 ${
        active ? "border-copper ring-2 ring-copper/25" : emphasis ? "border-brick/40" : "border-line"
      } ${onClick ? "hover:border-ink/25" : ""}`}
    >
      {Icon && (
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11 ${TONES[tone] || TONES.ink}`}>
          <Icon size={19} aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 w-full">
        <span className="num block text-xl font-extrabold leading-tight text-ink sm:text-2xl">{value}</span>
        <span className="block text-xs font-bold leading-5 text-muted sm:truncate">{label}</span>
        {hint && <span className="block text-xs font-bold text-brick sm:truncate">{hint}</span>}
      </span>
    </Tag>
  );
}
