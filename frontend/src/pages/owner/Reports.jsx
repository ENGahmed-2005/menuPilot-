/* ==========================================================================
   Reports.jsx — مؤشر اتجاه المبيعات. FR-40.
   حالة سكافولد: placeholder فقط، بانتظار endpoint مخصّص للتقارير من الـ backend
   (غير موجود بعد ضمن api/orders.js — أضِف getSalesTrend عند جاهزية الـ backend).
   ========================================================================== */
import { BarChart3 } from "lucide-react";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";

export default function Reports() {
  return (
    <div>
      <PageHeader title="اتجاه المبيعات" subtitle="حجم الطلبات والإيرادات عبر الزمن." />

      <Card className="flex flex-col items-center gap-3 border-dashed px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 text-ink-soft/50">
          <BarChart3 size={22} aria-hidden="true" />
        </span>
        <p className="font-medium text-ink-soft">قيد التطوير (FR-40)</p>
        <p className="max-w-md text-sm leading-relaxed text-ink-soft/70">
          سيتم ربط هذه الصفحة بمسار{" "}
          <code className="rounded bg-ink/8 px-1.5 py-0.5 font-mono text-xs text-ink">
            GET /owner/reports/sales-trend
          </code>{" "}
          بمجرد توفره من الـ backend، ثم عرضه عبر مكتبة رسوم بيانية (مثل recharts).
        </p>
      </Card>
    </div>
  );
}
