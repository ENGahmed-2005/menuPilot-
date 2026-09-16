/* ==========================================================================
   Dashboard.jsx — الصفحة الرئيسية للوحة صاحب المطعم
   يغطي: FR-21 (قائمة الطلبات الحالية والسابقة), FR-40 (مؤشر اتجاه المبيعات)
   ========================================================================== */
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Clock3, DollarSign, TrendingUp } from "lucide-react";
import { getOwnerOrders } from "../../api/orders";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";
import StatCard from "../../components/dashboard/StatCard";

const STATUS_TONE = {
  pending: "warning",
  preparing: "warning",
  ready: "good",
  served: "good",
  cancelled: "danger",
};

const STATUS_LABEL_AR = {
  pending: "قيد الانتظار",
  preparing: "قيد التحضير",
  ready: "جاهز",
  served: "تم التقديم",
  cancelled: "ملغي",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getOwnerOrders()
      .then(setOrders)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  // ملخّص سريع محسوب من نفس بيانات الطلبات — بدون أي endpoint إضافي.
  const stats = useMemo(() => {
    const openStatuses = ["pending", "preparing"];
    const openOrders = orders.filter((o) => openStatuses.includes(String(o.status).toLowerCase()));
    const revenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    return {
      total: orders.length,
      open: openOrders.length,
      revenue,
    };
  }, [orders]);

  return (
    <div>
      <PageHeader
        title={`أهلاً بك${user?.restaurantName ? `، ${user.restaurantName}` : ""}`}
        subtitle="نظرة سريعة على طلبات مطعمك اليوم."
      />

      {loading && <Spinner label="جارِ تحميل الطلبات…" />}
      {error && (
        <p role="alert" className="rounded-lg bg-brick/10 px-3 py-2 text-sm text-brick">
          تعذّر تحميل الطلبات: {error.message}
        </p>
      )}

      {!loading && !error && (
        <>
          {/* صف الإحصائيات — قراءة سريعة قبل تفاصيل الجدول */}
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard icon={ClipboardList} label="إجمالي الطلبات" value={stats.total} tone="ink" />
            <StatCard icon={Clock3} label="طلبات مفتوحة الآن" value={stats.open} tone="copper" />
            <StatCard icon={DollarSign} label="إجمالي الإيرادات" value={stats.revenue.toFixed(2)} tone="herb" />
          </div>

          <Card className="overflow-hidden">
            {orders.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="لا توجد طلبات بعد"
                description="ستظهر طلبات الزبائن هنا فور إرسالها من صفحة القائمة."
              />
            ) : (
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-ink/10 bg-ink/[0.03] text-ink-soft">
                    <th className="px-4 py-3 font-medium">رقم الطلب</th>
                    <th className="px-4 py-3 font-medium">الطاولة</th>
                    <th className="px-4 py-3 font-medium">الحالة</th>
                    <th className="px-4 py-3 font-medium">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/8">
                  {orders.map((o) => {
                    const key = String(o.status).toLowerCase();
                    return (
                      <tr key={o.id} className="transition-colors hover:bg-ink/[0.02]">
                        <td className="px-4 py-3 font-medium text-ink">{o.orderNumber}</td>
                        <td className="px-4 py-3 text-ink-soft">{o.tableLabel}</td>
                        <td className="px-4 py-3">
                          <Badge tone={STATUS_TONE[key] || "neutral"}>{STATUS_LABEL_AR[key] || o.status}</Badge>
                        </td>
                        <td className="px-4 py-3 font-medium text-ink">{o.total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}

      {/* TODO (FR-40): sales-trend chart — order volume & revenue over time */}
      <Card className="mt-6 flex items-center gap-3 border-dashed p-4 text-sm text-ink-soft">
        <TrendingUp size={18} className="shrink-0 text-ink-soft/60" aria-hidden="true" />
        رسم بياني لاتجاه المبيعات قيد التطوير — راجع صفحة التقارير.
      </Card>
    </div>
  );
}
