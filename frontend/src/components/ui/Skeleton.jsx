import { t } from "../../i18n";
/* ==========================================================================
   Skeleton.jsx — loading placeholders that match the final layout, so the
   page doesn't jump when data arrives. Announced once to screen readers.
   ========================================================================== */
export default function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

/** A grid of card-shaped placeholders (dashboards, KDS, tables). */
export function SkeletonCards({ count = 6, className = "", cardClassName = "h-44", label = t("جارِ تحميل البيانات…") }) {
  return (
    <div role="status" aria-live="polite" className={className || "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden="true" className={`rounded-[var(--radius-card)] border border-line bg-surface p-5 ${cardClassName}`}>
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton mt-3 h-3 w-1/2" />
          <div className="skeleton mt-6 h-3 w-full" />
          <div className="skeleton mt-2 h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

/** Row of KPI placeholders. */
export function SkeletonStats({ count = 4 }) {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <div className="skeleton h-3 w-1/2" />
          <div className="skeleton mt-3 h-7 w-1/3" />
        </div>
      ))}
    </div>
  );
}
