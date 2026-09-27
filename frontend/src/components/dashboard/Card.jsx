/* ==========================================================================
   Card.jsx — the surface every dashboard section sits on.
   One radius, one border, one shadow across the product.
   interactive: adds hover/focus affordance for clickable cards.
   ========================================================================== */
export default function Card({ as: Tag = "div", interactive = false, className = "", children, ...rest }) {
  return (
    <Tag
      className={`rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)] ${
        interactive ? "transition-[border-color,box-shadow] duration-150 hover:border-ink/20 hover:shadow-[var(--shadow-raised)]" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Title row inside a card: heading, short context, optional action. */
export function CardHeader({ title, description, action, className = "" }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-base font-extrabold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
