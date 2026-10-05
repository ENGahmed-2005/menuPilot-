/* ==========================================================================
   EmptyState.jsx — icon + what is missing + what to do next.
   An empty screen should always offer the next step (action).
   ========================================================================== */
export default function EmptyState({ icon: Icon, title, description, action, compact = false }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14"}`}>
      {Icon && (
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-copper/10 text-copper-ink">
          <Icon size={22} aria-hidden="true" />
        </span>
      )}
      <p className="text-base font-extrabold text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm leading-6 text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
