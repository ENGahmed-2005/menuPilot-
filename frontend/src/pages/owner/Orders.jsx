/* ==========================================================================
   Orders.jsx — owner/manager orders screen (route /owner/orders).
   Filter by status and day, open an order to see its items and history,
   move it to the next step (manage_orders) or cancel it with a reason
   (cancel_orders). The API enforces both permissions and the restaurant scope.
   ========================================================================== */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, RefreshCw } from "lucide-react";
import { cancelOrder, getOwnerOrder, getOwnerOrders, setOrderStatus } from "../../api/orders";
import { usePermissions } from "../../hooks/usePermissions";
import { errorText } from "../../utils/errors";
import { money, orderNo, tableName } from "../../utils/format";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import SegmentedControl from "../../components/ui/SegmentedControl";
import StatusBadge from "../../components/ui/StatusBadge";
import Skeleton from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";

const NEXT = { pending: ["preparing", "ابدأ التحضير"], preparing: ["ready", "جاهز للتقديم"], ready: ["served", "تم التقديم"] };
const FILTERS = [
  { value: "active", label: "قيد العمل" },
  { value: "all", label: "الكل" },
  { value: "served", label: "مُقدّمة" },
  { value: "cancelled", label: "ملغاة" },
];
const today = () => new Date().toISOString().slice(0, 10);
const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString("ar-PS-u-nu-latn", { hour: "2-digit", minute: "2-digit" }) : "—");

export default function Orders() {
  const { can } = usePermissions();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("active");
  const [day, setDay] = useState(today());
  const [busyId, setBusyId] = useState(null);
  const [detail, setDetail] = useState(null); // { order, loading }
  const [cancelling, setCancelling] = useState(null); // { order, reason, saving, error }

  const load = useCallback(async () => {
    try {
      const data = await getOwnerOrders(day ? { from: day, to: day } : {});
      setOrders((data || []).map((o) => ({ ...o, status: String(o.status).toLowerCase() })));
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [day]);

  useEffect(() => {
    setLoading(true);
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const counts = useMemo(() => ({
    active: orders.filter((o) => NEXT[o.status]).length,
    all: orders.length,
    served: orders.filter((o) => o.status === "served").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  }), [orders]);

  const shown = useMemo(() => orders.filter((o) => (filter === "all" ? true : filter === "active" ? Boolean(NEXT[o.status]) : o.status === filter)), [orders, filter]);

  async function advance(order) {
    const [next] = NEXT[order.status] || [];
    if (!next) return;
    setBusyId(order.id);
    try {
      await setOrderStatus(order.id, next);
      setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
    } catch (err) {
      toast.error(errorText(err, "تعذّر تحديث حالة الطلب."));
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function openDetail(order) {
    setDetail({ order, loading: true });
    try {
      const full = await getOwnerOrder(order.id);
      setDetail({ order: { ...order, ...full }, loading: false });
    } catch (err) {
      setDetail({ order, loading: false, error: err });
    }
  }

  async function confirmCancel(event) {
    event.preventDefault();
    if (cancelling.reason.trim().length < 2) {
      setCancelling((c) => ({ ...c, error: "اكتب سببًا واضحًا للإلغاء." }));
      return;
    }
    setCancelling((c) => ({ ...c, saving: true, error: null }));
    try {
      await cancelOrder(cancelling.order.id, cancelling.reason.trim());
      setOrders((list) => list.map((o) => (o.id === cancelling.order.id ? { ...o, status: "cancelled" } : o)));
      toast.success(`أُلغي الطلب ${orderNo(cancelling.order.order_number || cancelling.order.id)}.`);
      setCancelling(null);
    } catch (err) {
      setCancelling((c) => ({ ...c, saving: false, error: errorText(err, "تعذّر إلغاء الطلب.") }));
    }
  }

  return (
    <div>
      <PageHeader
        title="الطلبات"
        subtitle="تابع طلبات اليوم وحرّكها بين المراحل، أو ألغِ طلبًا مع ذكر السبب."
        action={<Button variant="secondary" size="sm" onClick={load}><RefreshCw size={15} aria-hidden="true" /> تحديث</Button>}
      />

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SegmentedControl label="تصفية الطلبات" value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ ...f, count: counts[f.value] }))} />
        <label className="flex items-center gap-2 text-sm font-bold text-muted">
          اليوم
          <input type="date" value={day} max={today()} onChange={(e) => setDay(e.target.value)} className="h-10 rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-ink" />
        </label>
      </div>

      {error && <Alert tone="danger" className="mb-4" action={<Button size="sm" variant="secondary" onClick={load}>إعادة المحاولة</Button>}>{errorText(error, "تعذّر تحميل الطلبات.")}</Alert>}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-5" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : shown.length === 0 ? (
          <EmptyState icon={ClipboardList} title="لا توجد طلبات هنا" description="غيّر التصفية أو اليوم لعرض طلبات أخرى." />
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((o) => (
              <li key={o.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center">
                <button type="button" onClick={() => openDetail(o)} className="min-w-0 flex-1 text-right">
                  <p className="font-extrabold text-ink"><span className="num">{orderNo(o.order_number || o.id)}</span> <span className="text-sm font-bold text-muted">{o.table_label ? tableName(o.table_label) : ""}</span></p>
                  <p className="mt-0.5 text-xs text-muted">{timeOf(o.submitted_at)}{o.customer_name ? `، ${o.customer_name}` : ""} · <span className="num">{money(o.total)}</span></p>
                </button>
                <StatusBadge type="order" status={o.status} />
                <div className="flex gap-2">
                  {NEXT[o.status] && can("manage_orders") && (
                    <Button size="sm" loading={busyId === o.id} disabled={Boolean(busyId)} onClick={() => advance(o)}>{NEXT[o.status][1]}</Button>
                  )}
                  {!["served", "cancelled"].includes(o.status) && can("cancel_orders") && (
                    <Button size="sm" variant="ghost" className="text-brick" onClick={() => setCancelling({ order: o, reason: "", saving: false, error: null })}>إلغاء</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail ? `الطلب ${orderNo(detail.order.order_number || detail.order.id)}` : ""} description={detail?.order.table_label ? tableName(detail.order.table_label) : undefined}>
        {detail?.loading ? <Skeleton className="h-32" /> : detail?.error ? <Alert tone="danger">{errorText(detail.error)}</Alert> : detail && (
          <div className="space-y-4">
            <ul className="divide-y divide-line rounded-xl border border-line text-sm">
              {(detail.order.items || []).map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <span className={i.status === "cancelled" ? "text-muted line-through" : "font-bold"}>{i.quantity}× {i.name}{i.note && <span className="block text-xs font-medium text-copper-ink">{i.note}</span>}{i.cancel_reason && <span className="block text-xs font-medium text-brick">سبب الإلغاء: {i.cancel_reason}</span>}</span>
                  <span className="num shrink-0">{money(i.quantity * i.unit_price)}</span>
                </li>
              ))}
            </ul>
            {(detail.order.history || []).length > 0 && (
              <ol className="space-y-1.5 text-xs text-muted">
                {detail.order.history.map((h) => <li key={h.id} className="flex items-center gap-2"><StatusBadge type="order" status={h.to_status} /> {timeOf(h.created_at)}</li>)}
              </ol>
            )}
          </div>
        )}
      </Modal>

      <Modal open={Boolean(cancelling)} onClose={() => !cancelling?.saving && setCancelling(null)} size="sm"
        title={cancelling ? `إلغاء الطلب ${orderNo(cancelling.order.order_number || cancelling.order.id)}؟` : ""}
        description="تُلغى كل أصناف الطلب ويختفي من شاشة المطبخ. يُسجَّل السبب واسمك في سجل التدقيق.">
        {cancelling && (
          <form onSubmit={confirmCancel} className="space-y-4">
            <Input label="سبب الإلغاء" required autoFocus maxLength={500} value={cancelling.reason} error={cancelling.error}
              onChange={(e) => setCancelling((c) => ({ ...c, reason: e.target.value, error: null }))} placeholder="مثل: الزبون غادر قبل التحضير" />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCancelling(null)} disabled={cancelling.saving}>تراجع</Button>
              <Button type="submit" variant="danger" loading={cancelling.saving}>إلغاء الطلب</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
