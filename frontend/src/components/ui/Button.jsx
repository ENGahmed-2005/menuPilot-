/* ==========================================================================
   Button.jsx — the single button for the whole app.
   variant: primary | secondary | ghost | dark | danger
   size:    sm | md | lg | icon
   loading: shows a spinner, sets aria-busy and blocks repeat clicks.
   as:      render as another element (e.g. react-router <Link>).
   Primary uses dark ink text on brand orange: white-on-orange is 2.8:1 and
   fails WCAG AA, ink-on-orange is 5.3:1 and matches the logo.
   ========================================================================== */
const VARIANTS = {
  primary: "bg-copper text-ink hover:brightness-[0.93] active:brightness-90",
  secondary: "border border-line bg-surface text-ink hover:border-ink/25 hover:bg-surface-2",
  ghost: "text-ink-soft hover:bg-ink/[0.06] hover:text-ink",
  dark: "bg-ink text-paper hover:bg-ink-soft",
  danger: "bg-brick text-paper hover:bg-brick/90",
};

const SIZES = {
  sm: "h-9 gap-1.5 px-3 text-xs",
  md: "h-11 gap-2 px-4 text-sm",
  lg: "h-12 gap-2 px-6 text-base",
  icon: "h-10 w-10 justify-center",
};

export function buttonClasses({ variant = "primary", size = "md", block = false, className = "" } = {}) {
  return [
    "inline-flex shrink-0 select-none items-center justify-center rounded-[var(--radius-control)] font-bold",
    "transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.98]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    block ? "w-full" : "",
    className,
  ].join(" ");
}

export default function Button({
  as: Tag = "button",
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
  disabled,
  className = "",
  children,
  type,
  ...rest
}) {
  const isButton = Tag === "button";
  return (
    <Tag
      type={isButton ? type || "button" : undefined}
      disabled={isButton ? disabled || loading : undefined}
      aria-disabled={!isButton && (disabled || loading) ? true : undefined}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, block, className })}
      {...rest}
    >
      {loading && (
        <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </Tag>
  );
}
