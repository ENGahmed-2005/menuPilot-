/* ==========================================================================
   KitchenDashboard.jsx — لوحة المطبخ الحية
   يغطي: FR-18 (عرض فوري بدون refresh), FR-19 (تحديث الحالة),
         FR-38 (مؤشر وقت منقضٍ), FR-39 (فرز حسب وقت التحضير المتوقع)
   ========================================================================== */
import { useEffect, useState } from "react";
import { ChefHat, Clock3 } from "lucide-react";
import { getKitchenOrders, updateOrderStatus } from "../../api/orders";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";
import Badge from "../../components/ui/Badge";

const POLL_INTERVAL_MS = 4000; // نفس منطق useOrderTracking، بدون استخراج hook منفصل بعد

const STATUS_FLOW = ["Pending", "Preparing", "Ready", "Served"];

const STATUS_LABEL_AR = {
  Pending: "قيد الانتظار",
  Preparing: "قيد التحضير",
  Ready: "جاهز",
  Served: "تم التقديم",
};

const STATUS_TONE = {
  Pending: "warning",
  Preparing: "warning",
  Ready: "good",
  Served: "neutral",
};

function nextStatus(current) {
  const idx = STATUS_FLOW.indexOf(current);
  return STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
}

/** عدد الدقائق منذ إرسال الطلب — أساس مؤشر FR-38. */
function minutesElapsed(submittedAt) {
  return Math.floor((Date.now() - new Date(submittedAt).getTime()) / 60000);
}

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        // FR-39: فرز حسب وقت التحضير المتوقع، يُطلب من الـ backend مباشرة.
        const data = await getKitchenOrders({ sortBy: "prepTime" });
        if (!cancelled) setOrders(data ?? []);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  async function handleAdvanceStatus(order) {
    try {
      await updateOrderStatus(order.id, nextStatus(order.status));
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: nextStatus(o.status) } : o))
      );
    } catch (err) {
      setError(err);
    }
  }

  return (
    <div>
      <PageHeader title="المطبخ" subtitle="الطلبات الحية مرتّبة حسب وقت التحضير المتوقع." />

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-brick/10 px-3 py-2 text-sm text-brick">
          {error.message}
        </p>
      )}

      {loading ? null : orders.length === 0 ? (
        <Card>
          <EmptyState icon={ChefHat} title="لا توجد طلبات حاليًا" description="ستظهر الطلبات الجديدة هنا فور إرسالها من الزبائن." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => {
            const elapsed = minutesElapsed(order.submittedAt);
            // FR-38: مؤشر بصري (غير صوتي) للطلبات المتجاوزة لمتوسط وقت التحضير.
            const isLate = elapsed > order.avgPrepTimeMinutes;

            return (
              <Card
                key={order.id}
                className={`flex flex-col gap-3 p-4 ${isLate ? "border-brick/40 bg-brick/5" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-ink">
                    طلب #{order.orderNumber} — طاولة {order.tableLabel}
                  </span>
                  <Badge tone={STATUS_TONE[order.status] || "neutral"}>
                    {STATUS_LABEL_AR[order.status] || order.status}
                  </Badge>
                </div>

                <span className={`flex items-center gap-1.5 text-sm ${isLate ? "font-medium text-brick" : "text-ink-soft"}`}>
                  <Clock3 size={14} aria-hidden="true" />
                  مضى {elapsed} دقيقة{isLate ? " ⚠️" : ""}
                </span>

                <ul className="space-y-1 border-t border-ink/8 pt-3 text-sm text-ink-soft">
                  {order.items.map((it, i) => (
                    <li key={i}>
                      <span className="font-medium text-ink">{it.quantity}×</span> {it.name}
                      {it.note && <span className="italic"> — {it.note}</span>}
                    </li>
                  ))}
                </ul>

                {order.status !== "Served" && (
                  <button
                    onClick={() => handleAdvanceStatus(order)}
                    className="mt-1 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
                  >
                    تحويل إلى {STATUS_LABEL_AR[nextStatus(order.status)] || nextStatus(order.status)}
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
