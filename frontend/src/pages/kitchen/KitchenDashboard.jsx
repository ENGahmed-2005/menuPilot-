/* ==========================================================================
   KitchenDashboard.jsx — Kitchen Display System (US-12, US-13, US-14).
   Built for a wall tablet read from a distance: late orders first, one big
   "next step" button per ticket, elapsed time that ticks by itself, and a
   status shown with text + icon + colour. Refreshes every 4 seconds.
   Wall mode: full screen, one column per status, larger type, the screen
   kept awake (Wake Lock) — for the tablet on the kitchen wall. Remembered
   on this device; Esc or the button leaves it.
   ========================================================================== */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlarmClock, ChefHat, Clock3, Maximize2, MessageSquareText, Minimize2, RefreshCw } from "lucide-react";
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
import { orderNo, tableName } from "../../utils/format";
import { AR, countAr } from "../../utils/plural";

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
    // Only tickets still in the kitchen can be late; "ready" is waiting on a waiter.
    return { ...o, elapsed, limit, late: ["pending", "preparing"].includes(o.status) && elapsed > limit };
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

  // Wall mode shows every active ticket, in its column, late ones first.
  const shownAll = useMemo(() => enriched
    .filter((o) => o.status !== "served")
    .sort((a, b) => Number(b.late) - Number(a.late) || (a.limit - a.elapsed) - (b.limit - b.elapsed)), [enriched]);
  const [wall, setWall] = useState(() => { try { return localStorage.getItem("kitchen.wall") === "1"; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem("kitchen.wall", wall ? "1" : "0"); } catch { /* private mode */ } }, [wall]);
  useEffect(() => {
    if (!wall) return undefined;
    let lock = null;
    navigator.wakeLock?.request?.("screen").then((l) => { lock = l; }).catch(() => {});
    const onKey = (e) => { if (e.key === "Escape") setWall(false); };
    window.addEventListener("keydown", onKey);
    return () => { lock?.release?.().catch?.(() => {}); window.removeEventListener("keydown", onKey); };
  }, [wall]);

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

  function enterWall() {
    setWall(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
  function leaveWall() {
    setWall(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }

  if (wall) {
    const columns = [["pending", "جديدة"], ["preparing", "قيد التحضير"], ["ready", "جاهزة للتقديم"]];
    return (
      <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[#121b25] text-paper" role="region" aria-label="شاشة المطبخ، وضع الحائط">
        <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-3">
          <ChefHat size={24} aria-hidden="true" />
          <h1 className="text-xl font-extrabold">المطبخ</h1>
          <LiveIndicator connected={connected} />
          {counts.late > 0 && <span className="rounded-full bg-brick px-3 py-1 text-base font-extrabold text-white">{countAr(counts.late, AR.lateOrders)}</span>}
          <span className="num ms-auto text-2xl font-extrabold tabular-nums" aria-label="الساعة">{new Date(now).toLocaleTimeString("ar-PS-u-nu-latn", { hour: "2-digit", minute: "2-digit" })}</span>
          <Button variant="secondary" onClick={leaveWall}><Minimize2 size={16} aria-hidden="true" /> الخروج</Button>
        </header>
        {error && <Alert tone="danger" className="m-4 mb-0" onDismiss={() => setError(null)}>{errorText(error, "تعذّر تحديث الطلبات.")}</Alert>}
        <div className="grid flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-3 md:overflow-hidden">
          {columns.map(([status, label]) => {
            const list = shownAll.filter((o) => o.status === status);
            return (
              <section key={status} className="flex min-h-0 flex-col rounded-2xl bg-white/[0.05]" aria-label={label}>
                <h2 className="flex items-center justify-between px-4 py-3 text-xl font-extrabold">
                  {label}<span className="num grid min-w-10 place-items-center rounded-lg bg-white/10 px-2 py-0.5 text-lg">{list.length}</span>
                </h2>
                <ul className="flex-1 space-y-3 overflow-y-auto px-3 pb-3">
                  {list.map((o) => <li key={o.id}><Ticket o={o} busyId={busyId} onAdvance={advance} big /></li>)}
                  {!list.length && <li className="px-1 py-6 text-center text-base text-white/50">لا طلبات هنا الآن.</li>}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="شاشة المطبخ"
        subtitle="الطلبات المتأخرة تظهر أولًا. اضغط الزر في كل تذكرة لنقلها إلى المرحلة التالية."
        meta={<LiveIndicator connected={connected} />}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={load}><RefreshCw size={15} aria-hidden="true" /> تحديث</Button>
            <Button onClick={enterWall}><Maximize2 size={15} aria-hidden="true" /> وضع شاشة المطبخ</Button>
          </div>
        }
      />

      {error && (
        <Alert tone="danger" className="mb-4" onDismiss={() => setError(null)}>{errorText(error, "تعذّر تحديث الطلبات.")}</Alert>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {FILTERS.map((f) => (
          <StatCard key={f.value} icon={f.icon} tone={f.tone} label={f.label} value={counts[f.value]} onClick={() => setFilter(f.value)} active={filter === f.value}
            hint={f.value === "active" && counts.late ? countAr(counts.late, AR.lateOrders) : undefined} emphasis={f.value === "active" && counts.late > 0} />
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
          {shown.map((o) => <li key={o.id}><Ticket o={o} busyId={busyId} onAdvance={advance} /></li>)}
        </ul>
      )}
    </div>
  );
}

/* One order ticket. `big` = wall mode: larger number and items. */
function Ticket({ o, busyId, onAdvance, big = false }) {
  return (
    <Card className={`flex h-full flex-col ${o.late ? "border-brick/60 ring-2 ring-brick/40" : ""}`}>
      <div className="flex items-start justify-between gap-3 border-b border-line p-4">
        <div>
          <p className={`num font-extrabold leading-none text-ink ${big ? "text-3xl" : "text-2xl"}`}>{orderNo(o.orderNumber)}</p>
          <p className={`mt-1.5 font-bold text-ink-soft ${big ? "text-base" : "text-sm"}`}>{tableName(o.tableLabel)}{o.customerName ? <span className="font-medium text-muted">، {o.customerName}</span> : null}</p>
        </div>
        <StatusBadge type="order" status={o.status} />
      </div>
      <div className={`flex items-center gap-2 px-4 pt-3 font-bold ${o.late ? "text-brick" : "text-muted"} ${big ? "text-base" : "text-sm"}`}>
        {o.late ? <AlarmClock size={16} aria-hidden="true" /> : <Clock3 size={16} aria-hidden="true" />}
        <span>
          <span className="num">منذ {o.elapsed} د</span>
          <span className="font-medium">{o.late ? `، تجاوز الوقت المتوقع (${o.limit} د)` : ` من ${o.limit} د متوقعة`}</span>
        </span>
      </div>
      <ul className="flex-1 space-y-2 px-4 py-3">
        {(o.items || []).map((item, index) => (
          <li key={item.id || index} className={big ? "text-lg leading-7" : "text-[0.95rem] leading-6"}>
            <span className={`num ml-1.5 inline-grid min-w-7 place-items-center rounded-md bg-navy px-1.5 font-extrabold text-paper ${big ? "text-base" : "text-sm"}`}>{item.quantity}×</span>
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
          <Button block size="lg" variant={o.status === "ready" ? "dark" : "primary"} loading={busyId === o.id} disabled={Boolean(busyId) && busyId !== o.id} onClick={() => onAdvance(o)}>
            {NEXT_ACTION[o.status]}
          </Button>
        </div>
      )}
    </Card>
  );
}
