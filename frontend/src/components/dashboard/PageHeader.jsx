/* ==========================================================================
   PageHeader.jsx — every dashboard page starts the same way:
   title → one line of context → status (meta) → primary action.
   ========================================================================== */
export default function PageHeader({ title, subtitle, meta, action }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold leading-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">{subtitle}</p>}
        {meta && <div className="mt-2.5">{meta}</div>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}
