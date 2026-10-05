/* ==========================================================================
   SegmentedControl.jsx — filter/tab switch with counts.
   options: [{ value, label, count? }]. Uses aria-pressed and wraps on mobile
   instead of overflowing the screen.
   ========================================================================== */
export default function SegmentedControl({ options, value, onChange, label, className = "" }) {
  return (
    <div role="group" aria-label={label} className={`flex flex-wrap gap-1 rounded-[var(--radius-control)] bg-ink/[0.05] p-1 ${className}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-[calc(var(--radius-control)-0.25rem)] px-3 text-xs font-bold transition-colors ${
              active ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-muted hover:text-ink"
            }`}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={`num rounded-full px-1.5 py-0.5 text-[0.7rem] leading-none ${active ? "bg-copper text-ink" : "bg-ink/[0.07]"}`}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
