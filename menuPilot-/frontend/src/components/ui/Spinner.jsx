/* ==========================================================================
   Spinner.jsx — مؤشر تحميل بسيط (بديل عن كل "Loading…" النصية المكرّرة
   بالسكافولد الحالي لصفحات owner/kitchen/cashier/waiter).
   ========================================================================== */
export default function Spinner({ label = "جارِ التحميل…" }) {
  return (
    <div
      className="flex items-center justify-center gap-3 py-10 text-sm text-ink-soft"
      role="status"
      aria-live="polite"
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/15 border-t-copper" />
      {label}
    </div>
  );
}
