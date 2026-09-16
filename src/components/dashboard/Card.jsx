/* ==========================================================================
   Card.jsx — بطاقة محتوى موحّدة (بديل عن تكرار
   "rounded-xl border border-ink/10 bg-white/60 shadow-sm" في كل صفحة).
   ========================================================================== */
export default function Card({ as: Tag = "div", className = "", children, ...rest }) {
  return (
    <Tag
      className={`rounded-xl border border-ink/10 bg-white/70 shadow-sm shadow-ink/[0.03] ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
