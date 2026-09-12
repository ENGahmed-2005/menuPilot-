/* ==========================================================================
   Button.jsx — زر موحّد الشكل عبر التطبيق
   variant: "primary" (افتراضي) | "secondary" | "danger"
   ========================================================================== */
const VARIANTS = {
  primary:
    "bg-copper text-paper hover:bg-copper-deep focus-visible:outline-copper",
  secondary:
    "bg-transparent text-ink border border-ink/20 hover:bg-ink/5 focus-visible:outline-ink-soft",
  danger:
    "bg-brick text-paper hover:bg-brick/85 focus-visible:outline-brick",
};

export default function Button({ variant = "primary", className = "", children, ...rest }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
