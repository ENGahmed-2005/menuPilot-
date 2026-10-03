/* ==========================================================================
   SubscriptionDashboard.jsx — owner overview (route /owner/dashboard).
   Built from live data (orders, sessions, tables, 7-day sales) instead of
   sample numbers. Reads top-down: what needs attention → today's numbers →
   live orders → trend and best sellers. Each section loads and fails on its
   own, so one slow endpoint never blanks the whole page.
   ========================================================================== */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2, ClipboardList, CookingPot, QrCode, RefreshCw,
  TrendingUp, UtensilsCrossed, Wallet, LayoutGrid,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import { getOwnerOrders } from "../../api/orders";
import { getActiveSessions } from "../../api/sessions";
import { getTables } from "../../api/tables";
import Card, { CardHeader } from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";
import PageHeader from "../../components/dashboard/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import Alert from "../../components/ui/Alert";
import Button, { buttonClasses } from "../../components/ui/Button";
import StatusBadge from "../../components/ui/StatusBadge";
import Skeleton, { SkeletonStats } from "../../components/ui/Skeleton";
import { errorText } from "../../utils/errors";
import { money, orderNo, tableName } from "../../utils/format";
import { AR, countAr } from "../../utils/plural";
import { t as tr, locale } from "../../i18n";

const ACTIVE = ["pending", "preparing", "ready"];
const LATE_AFTER_MIN = 20;
const todayKey = () => new Date().toISOString().slice(0, 10);
const minutesAgo = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
const timeAgo = (iso) => {
  if (!iso) return "—";
  const m = minutesAgo(iso);
  if (m < 1) return tr("الآن");
  if (m < 60) return tr("منذ {0} د", { 0: m });
  const h = Math.floor(m / 60);
  return h < 24 ? tr("منذ {0} س", { 0: h }) : new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });
};
const greeting = () => (new Date().getHours() < 12 ? tr("صباح الخير") : tr("مساء الخير"));

function useSection(loader) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    return loader().then((data) => setState({ data, error: null, loading: false })).catch((error) => setState({ data: null, error, loading: false }));
  }, [loader]);
  return [state, load];
}

function SalesChart({ trend }) {
  // Fill the last 7 days so missing days show as zero instead of disappearing.
  const days = useMemo(() => {
    const byDate = Object.fromEntries((trend || []).map((d) => [d.date, d]));
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const key = date.toISOString().slice(0, 10);
      return { key, label: date.toLocaleDateString(locale, { weekday: "short" }), revenue: Number(byDate[key]?.revenue || 0), orders: Number(byDate[key]?.orders || 0) };
    });
  }, [trend]);
  const max = Math.max(...days.map((d) => d.revenue), 1);
  const total = days.reduce((sum, d) => sum + d.revenue, 0);

  if (total === 0) {
    return <EmptyState compact icon={TrendingUp} title={tr("لا توجد مبيعات مؤكدة خلال آخر 7 أيام")} description={tr("تظهر هنا الإيرادات يوميًا بعد تأكيد أول دفعة.")} />;
  }
  return (
    <figure className="px-5 pb-5 pt-6">
      <div className="flex h-44 items-end gap-2 sm:gap-3" role="img" aria-label={tr("مبيعات آخر 7 أيام، الإجمالي {0}", { 0: money(total) })}>
        {days.map((d) => (
          <div key={d.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="num text-[0.7rem] font-bold text-muted opacity-0 transition-opacity group-hover:opacity-100">{d.revenue ? money(d.revenue) : ""}</span>
            <div className={`w-full rounded-t-lg ${d.key === todayKey() ? "bg-copper" : "bg-ink/15 group-hover:bg-ink/25"}`} style={{ height: `${Math.max(4, (d.revenue / max) * 100)}%` }} title={tr("{0}: {1}، {2} طلب", { 0: d.label, 1: money(d.revenue), 2: d.orders })} />
            <span className="text-xs font-bold text-muted">{d.label}</span>
          </div>
        ))}
      </div>
      <figcaption className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
        <span className="text-muted">{tr("إجمالي آخر 7 أيام")}</span>
        <span className="num font-extrabold text-ink">{money(total)}</span>
      </figcaption>
    </figure>
  );
}

export default function SubscriptionDashboard() {
  const { user } = useAuth();
  const [orders, loadOrders] = useSection(useCallback(() => getOwnerOrders({ from: todayKey() }), []));
  const [sessions, loadSessions] = useSection(useCallback(() => getActiveSessions(), []));
  const [tables, loadTables] = useSection(useCallback(() => getTables(), []));
  const [sales, loadSales] = useSection(useCallback(() => api.get("/owner/reports/sales-trend?days=7"), []));

  const refreshAll = useCallback(() => { loadOrders(); loadSessions(); loadTables(); loadSales(); }, [loadOrders, loadSessions, loadTables, loadSales]);
  useEffect(() => {
    refreshAll();
    const id = setInterval(() => { loadOrders(); loadSessions(); }, 15000);
    return () => clearInterval(id);
  }, [refreshAll, loadOrders, loadSessions]);

  const orderList = useMemo(() => (orders.data || []).map((o) => ({ ...o, status: String(o.status || "").toLowerCase() })), [orders.data]);
  const sessionList = sessions.data || [];
  const tableList = tables.data || [];

  const stats = useMemo(() => {
    const active = orderList.filter((o) => ACTIVE.includes(o.status));
    const today = (sales.data?.trend || []).find((d) => d.date === todayKey());
    return {
      ordersToday: orderList.filter((o) => o.status !== "cancelled").length,
      active: active.length,
      late: active.filter((o) => o.status !== "ready" && minutesAgo(o.submitted_at) > LATE_AFTER_MIN).length,
      revenueToday: Number(today?.revenue || 0),
      occupied: tableList.filter((t) => String(t.status).toLowerCase() !== "available").length,
      tables: tableList.length,
      help: sessionList.filter((s) => s.assistanceRequested).length,
      bills: sessionList.filter((s) => s.billRequested).length,
    };
  }, [orderList, sessionList, tableList, sales.data]);

  const liveOrders = useMemo(() => [...orderList]
    .sort((a, b) => Number(ACTIVE.includes(b.status)) - Number(ACTIVE.includes(a.status)) || new Date(b.submitted_at) - new Date(a.submitted_at))
    .slice(0, 8), [orderList]);

  const attention = [
    // Each alert takes you where it can be dealt with.
    stats.late && { tone: "danger", text: countAr(stats.late, AR.ordersLateInKitchen, { m: LATE_AFTER_MIN }), to: "/kitchen", go: tr("افتح شاشة المطبخ") },
    stats.help && { tone: "danger", text: countAr(stats.help, AR.tablesAskingWaiter), to: "/waiter", go: tr("اذهب للطاولات") },
    stats.bills && { tone: "warning", text: countAr(stats.bills, AR.tablesAskedBill), to: "/cashier/tables", go: tr("افتح الفواتير") },
  ].filter(Boolean);

  const firstLoad = orders.loading && !orders.data;
  const noSetup = !tables.loading && tableList.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={tr("{0}، {1}", { 0: greeting(), 1: user?.name || "صاحب المطعم" })}
        subtitle={tr("صورة مطعمك الآن: ما يحتاج انتباهك، طلبات اليوم، وحالة الطاولات.")}
        action={<>
          <Button variant="secondary" size="sm" onClick={refreshAll}><RefreshCw size={15} aria-hidden="true" /> {tr("تحديث")}</Button>
          <Link to="/owner/menu" className={buttonClasses({ size: "sm" })}><UtensilsCrossed size={15} aria-hidden="true" /> {tr("إدارة المنيو")}</Link>
        </>}
      />

      {noSetup ? (
        <Alert tone="info" title={tr("ابدأ بإعداد مطعمك")} action={<Link to="/owner/tables" className={buttonClasses({ size: "sm" })}><QrCode size={15} aria-hidden="true" /> {tr("إضافة طاولة")}</Link>}>
          {tr("أضف طاولاتك واطبع رموز QR، ثم أضف أصناف المنيو ليبدأ الزبائن بالطلب.")}
        </Alert>
      ) : attention.length ? (
        <section aria-label={tr("تحتاج انتباهك")} className="grid gap-2 md:grid-cols-3">
          {attention.map(({ tone, text, to, go }) => (
            <Alert key={text} tone={tone} action={<Link to={to} className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-extrabold underline-offset-4 hover:underline">{go}</Link>}>{text}</Alert>
          ))}
        </section>
      ) : !firstLoad && !sessions.loading ? (
        <Alert tone="success">{tr("لا شيء يحتاج انتباهك الآن. كل الطلبات ضمن الوقت المتوقع.")}</Alert>
      ) : null}

      {firstLoad ? <SkeletonStats /> : (
        <section aria-label={tr("أرقام اليوم")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* Today's sales lead: the number an owner checks first. */}
          <StatCard featured className="col-span-2 lg:col-span-1" icon={Wallet} tone="herb" label={tr("مبيعات اليوم المؤكدة")} value={sales.loading && !sales.data ? "…" : money(stats.revenueToday)} />
          <StatCard icon={ClipboardList} label={tr("طلبات اليوم")} value={stats.ordersToday} />
          <StatCard icon={CookingPot} tone="info" label={tr("طلبات قيد العمل")} value={stats.active} hint={stats.late ? countAr(stats.late, AR.lateOrders) : undefined} emphasis={stats.late > 0} />
          <StatCard icon={LayoutGrid} tone="copper" label={tr("طاولات مشغولة")} value={tables.loading && !tables.data ? "…" : `${stats.occupied} / ${stats.tables}`} />
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <CardHeader title={tr("طلبات اليوم")} description={tr("الطلبات قيد العمل تظهر أولًا.")} action={<Link to="/owner/reports" className="text-sm font-bold text-copper-ink hover:underline">{tr("كل التقارير")}</Link>} />
          {orders.error ? (
            <div className="p-5"><Alert tone="danger" action={<Button size="sm" variant="secondary" onClick={loadOrders}>{tr("إعادة المحاولة")}</Button>}>{errorText(orders.error, tr("تعذّر تحميل الطلبات."))}</Alert></div>
          ) : firstLoad ? (
            <div className="space-y-3 p-5" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : liveOrders.length === 0 ? (
            <EmptyState compact icon={ClipboardList} title={tr("لا توجد طلبات اليوم بعد")} description={tr("عندما يطلب الزبائن من رمز QR على الطاولة تظهر طلباتهم هنا مباشرة.")} />
          ) : (
            <>
              {/* Mobile: stacked rows instead of a wide table. */}
              <ul className="divide-y divide-line md:hidden">
                {liveOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="font-extrabold text-ink"><span className="num">{orderNo(o.order_number || o.id)}</span> <span className="text-sm font-bold text-muted">{tableName(o.table_label)}</span></p>
                      <p className="mt-0.5 text-xs text-muted">{timeAgo(o.submitted_at)} <span className="num">{tr("،")} {money(o.total)}</span></p>
                    </div>
                    <StatusBadge type="order" status={o.status} />
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-right text-sm">
                  <thead className="bg-surface-2 text-xs font-bold text-muted">
                    <tr><th scope="col" className="px-5 py-3">{tr("الطلب")}</th><th scope="col" className="px-3">{tr("الطاولة")}</th><th scope="col" className="px-3">{tr("الحالة")}</th><th scope="col" className="px-3">{tr("القيمة")}</th><th scope="col" className="px-5">{tr("الوقت")}</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {liveOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-surface-2/60">
                        <td className="num px-5 py-3.5 font-extrabold text-ink">{orderNo(o.order_number || o.id)}</td>
                        <td className="px-3 py-3.5">{o.table_label ? tableName(o.table_label) : "—"}{o.customer_name && <span className="block text-xs text-muted">{o.customer_name}</span>}</td>
                        <td className="px-3 py-3.5"><StatusBadge type="order" status={o.status} /></td>
                        <td className="num px-3 py-3.5 font-bold">{money(o.total)}</td>
                        <td className="px-5 py-3.5 text-xs text-muted">{timeAgo(o.submitted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>

        <Card className="flex flex-col">
          <CardHeader title={tr("حالة الطاولات")} description={tr("الجلسات المفتوحة الآن.")} />
          <div className="grid flex-1 grid-cols-2 gap-3 p-5">
            <div className="rounded-xl bg-copper/10 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-copper-ink"><UtensilsCrossed size={14} aria-hidden="true" /> {tr("مشغولة")}</p>
              <p className="num mt-2 text-3xl font-extrabold text-ink">{tables.data ? stats.occupied : "…"}</p>
            </div>
            <div className="rounded-xl bg-herb/10 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-herb"><CheckCircle2 size={14} aria-hidden="true" /> {tr("متاحة")}</p>
              <p className="num mt-2 text-3xl font-extrabold text-ink">{tables.data ? stats.tables - stats.occupied : "…"}</p>
            </div>
          </div>
          <div className="border-t border-line p-4">
            <Link to="/owner/tables" className={buttonClasses({ variant: "secondary", block: true })}><QrCode size={16} aria-hidden="true" /> {tr("الطاولات ورموز QR")}</Link>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title={tr("المبيعات المؤكدة")} description={tr("آخر 7 أيام. عمود اليوم باللون البرتقالي.")} />
          {sales.error ? <div className="p-5"><Alert tone="danger" action={<Button size="sm" variant="secondary" onClick={loadSales}>{tr("إعادة المحاولة")}</Button>}>{errorText(sales.error, tr("تعذّر تحميل المبيعات."))}</Alert></div>
            : sales.loading && !sales.data ? <div className="p-5"><Skeleton className="h-44" /></div>
            : <SalesChart trend={sales.data?.trend} />}
        </Card>

        <Card>
          <CardHeader title={tr("الأكثر طلبًا")} description={tr("آخر 7 أيام.")} />
          {sales.loading && !sales.data ? <div className="space-y-3 p-5" aria-hidden="true">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-8" />)}</div>
            : (sales.data?.topItems || []).length === 0 ? <EmptyState compact icon={UtensilsCrossed} title={tr("لا توجد بيانات بعد")} description={tr("تظهر الأصناف الأكثر طلبًا بعد أول طلبات.")} />
            : (
              <ol className="space-y-3 p-5">
                {sales.data.topItems.map((item, index) => {
                  const top = Number(sales.data.topItems[0].quantity) || 1;
                  return (
                    <li key={item.name}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate font-bold text-ink"><span className="num ml-2 text-muted">{index + 1}</span>{item.name}</span>
                        <span className="num shrink-0 text-xs font-bold text-muted">{item.quantity} {tr("مرة")}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]"><div className="h-full rounded-full bg-copper" style={{ width: `${(Number(item.quantity) / top) * 100}%` }} /></div>
                    </li>
                  );
                })}
              </ol>
            )}
        </Card>
      </section>
    </div>
  );
}
