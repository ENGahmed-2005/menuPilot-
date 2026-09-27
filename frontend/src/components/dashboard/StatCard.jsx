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
      className={`flex w-full items-center gap-3.5 rounded-[var(--radius-card)] border bg-surface p-4 text-right shadow-[var(--shadow-card)] transition-colors ${
        active ? "border-copper ring-2 ring-copper/25" : emphasis ? "border-brick/40" : "border-line"
      } ${onClick ? "hover:border-ink/25" : ""}`}
    >
      {Icon && (
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${TONES[tone] || TONES.ink}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0">
        <span className="num block text-2xl font-extrabold leading-tight text-ink">{value}</span>
        <span className="block truncate text-xs font-bold text-muted">{label}</span>
        {hint && <span className="mt-0.5 block truncate text-xs text-muted">{hint}</span>}
      </span>
    </Tag>
  );
}
