/* ==========================================================================
   KitchenDashboard.jsx — Kitchen Display System (US-12, US-13, US-14).
   Built for a wall tablet read from a distance: late orders first, one big
   "next step" button per ticket, elapsed time that ticks by itself, and a
   status shown with text + icon + colour. Refreshes every 4 seconds.
   ========================================================================== */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlarmClock, ChefHat, Clock3, MessageSquareText, RefreshCw } from "lucide-react";
import { getKitchenOrders, updateOrderStatus } from "../../api/orders";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";
import StatCard from "../../components/dashboard/StatCard";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import LiveIndicator from "../../components/ui/LiveIndicator";
import StatusBadge, { statusMeta } from "../../components/ui/StatusBadge";
import { SkeletonCards } from "../../components/ui/Skeleton";
import { errorText } from "../../utils/errors";

const FLOW = ["pending", "preparing", "ready", "served"];
const NEXT_ACTION = { pending: "ابدأ التحضير", preparing: "جاهز للتقديم", ready: "تم التقديم" };
const FILTERS = [
  { value: "active", label: "قيد العمل", icon: ChefHat, tone: "ink" },
  { value: "pending", label: "جديدة", icon: statusMeta("order", "pending").icon, tone: "copper" },
  { value: "preparing", label: "قيد التحضير", icon: statusMeta("order", "preparing").icon, tone: "info" },
  { value: "ready", label: "جاهزة", icon: statusMeta("order", "ready").icon, tone: "herb" },
];
const POLL_MS = 4000;

const minutesSince = (iso, now) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
const normalize = (order) => ({ ...order, status: String(order.rawStatus || order.status || "").toLowerCase() });

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const data = await getKitchenOrders({ sortBy: "prepTime" });
      setOrders((data || []).map(normalize));
      setConnected(true);
    } catch (err) {
      setConnected(false);
      setError((current) => current || err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), 30000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [load]);

  const enriched = useMemo(() => orders.map((o) => {
    const elapsed = minutesSince(o.submittedAt, now);
    const limit = Number(o.expectedPrepMinutes || o.avgPrepTimeMinutes || 15);
    return { ...o, elapsed, limit, late: o.status !== "served" && elapsed > limit };
  }), [orders, now]);

  const counts = useMemo(() => ({
    active: enriched.filter((o) => o.status !== "served").length,
    pending: enriched.filter((o) => o.status === "pending").length,
    preparing: enriched.filter((o) => o.status === "preparing").length,
    ready: enriched.filter((o) => o.status === "ready").length,
    late: enriched.filter((o) => o.late).length,
  }), [enriched]);

  // Late tickets first, then by how close they are to their prep time.
  const shown = useMemo(() => enriched
    .filter((o) => (filter === "active" ? o.status !== "served" : o.status === filter))
    .sort((a, b) => Number(b.late) - Number(a.late) || (a.limit - a.elapsed) - (b.limit - b.elapsed)), [enriched, filter]);

  async function advance(order) {
    const next = FLOW[FLOW.indexOf(order.status) + 1];
    if (!next || busyId) return;
    setBusyId(order.id);
    setError(null);
    try {
      await updateOrderStatus(order.id, next);
      setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
    } catch (err) {
      setError(err);
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="شاشة المطبخ"
        subtitle="الطلبات المتأخرة تظهر أولًا. اضغط الزر في كل تذكرة لنقلها إلى المرحلة التالية."
        meta={<LiveIndicator connected={connected} />}
        action={<Button variant="secondary" size="sm" onClick={load}><RefreshCw size={15} aria-hidden="true" /> تحديث</Button>}
      />

      {error && (
        <Alert tone="danger" className="mb-4" onDismiss={() => setError(null)}>{errorText(error, "تعذّر تحديث الطلبات.")}</Alert>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {FILTERS.map((f) => (
          <StatCard key={f.value} icon={f.icon} tone={f.tone} label={f.label} value={counts[f.value]} onClick={() => setFilter(f.value)} active={filter === f.value}
            hint={f.value === "active" && counts.late ? `${counts.late} متأخر` : undefined} emphasis={f.value === "active" && counts.late > 0} />
        ))}
      </div>

      {loading ? (
        <SkeletonCards count={6} label="جارِ تحميل الطلبات…" />
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={ChefHat}
            title={filter === "active" ? "لا توجد طلبات قيد العمل" : `لا توجد طلبات ${FILTERS.find((f) => f.value === filter)?.label}`}
            description="تظهر الطلبات الجديدة هنا تلقائيًا خلال ثوانٍ من إرسالها."
            action={filter !== "active" && <Button variant="secondary" size="sm" onClick={() => setFilter("active")}>عرض كل الطلبات</Button>}
          />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((o) => (
            <li key={o.id}>
              <Card className={`flex h-full flex-col ${o.late ? "border-brick/50 ring-1 ring-brick/30" : ""}`}>
                <div className="flex items-start justify-between gap-3 border-b border-line p-4">
                  <div>
                    <p className="num text-2xl font-extrabold leading-none text-ink">#{o.orderNumber}</p>
                    <p className="mt-1.5 text-sm font-bold text-ink-soft">طاولة {o.tableLabel}{o.customerName ? <span className="font-medium text-muted"> ، {o.customerName}</span> : null}</p>
                  </div>
                  <StatusBadge type="order" status={o.status} />
                </div>

                <div className={`flex items-center gap-2 px-4 pt-3 text-sm font-bold ${o.late ? "text-brick" : "text-muted"}`}>
                  {o.late ? <AlarmClock size={16} aria-hidden="true" /> : <Clock3 size={16} aria-hidden="true" />}
                  <span className="num">منذ {o.elapsed} د</span>
                  <span className="font-medium">{o.late ? `، تجاوز الوقت المتوقع (${o.limit} د)` : `من ${o.limit} د متوقعة`}</span>
                </div>

                <ul className="flex-1 space-y-2 px-4 py-3">
                  {(o.items || []).map((item, index) => (
                    <li key={item.id || index} className="text-[0.95rem] leading-6">
                      <span className="num ml-1.5 inline-grid min-w-7 place-items-center rounded-md bg-ink px-1.5 text-sm font-extrabold text-paper">{item.quantity}×</span>
                      <span className="font-bold text-ink">{item.name}</span>
                      {item.note && (
                        <span className="mt-1 flex items-start gap-1.5 rounded-lg bg-copper/10 px-2 py-1 text-sm font-bold text-copper-ink">
                          <MessageSquareText size={14} className="mt-1 shrink-0" aria-hidden="true" />{item.note}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>

                {NEXT_ACTION[o.status] && (
                  <div className="p-4 pt-0">
                    <Button block size="lg" variant={o.status === "ready" ? "dark" : "primary"} loading={busyId === o.id} disabled={Boolean(busyId) && busyId !== o.id} onClick={() => advance(o)}>
                      {NEXT_ACTION[o.status]}
                    </Button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
