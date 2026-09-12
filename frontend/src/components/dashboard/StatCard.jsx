/* ==========================================================================
   StatCard.jsx — بطاقة إحصائية صغيرة (رقم + تسمية + أيقونة)، تُستخدم في
   صف الملخّص أعلى لوحة owner Dashboard.
   ========================================================================== */
import Card from "./Card";

export default function StatCard({ icon: Icon, label, value, tone = "ink" }) {
  const toneClass = {
    
    ink: "bg-ink/8 text-ink",
    copper: "bg-copper/15 text-copper-deep",
    herb: "bg-herb/15 text-herb",
    brick: "bg-brick/12 text-brick",
  }[tone];

  return (
    <Card className="flex items-center gap-4 p-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${toneClass}`}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="truncate text-2xl font-semibold leading-tight text-ink">{value}</div>
        <div className="truncate text-xs text-ink-soft">{label}</div>
      </div>
    </Card>
  );
}
