/* ==========================================================================
   EmptyState.jsx — حالة "لا يوجد بيانات" موحّدة، بأيقونة اختيارية.
   ========================================================================== */
export default function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 text-ink-soft/50">
          <Icon size={22} aria-hidden="true" />
        </span>
      )}
      <p className="font-medium text-ink-soft">{title}</p>
      {description && <p className="max-w-xs text-sm text-ink-soft/70">{description}</p>}
    </div>
  );
}
