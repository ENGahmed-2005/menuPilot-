/* ==========================================================================
   PageHeader.jsx — رأس صفحة موحّد لكل لوحات الإدارة (owner/kitchen/cashier/waiter)
   عنوان + وصف اختياري + منطقة action اختيارية (زر/فورم صغير) على اليسار.
   ========================================================================== */
export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
