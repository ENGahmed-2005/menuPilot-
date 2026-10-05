/* ==========================================================================
   DeliveryBoard.jsx — «التوصيل»: accepted delivery orders with the customer's
   map location (if shared) and typed address, for the restaurant's drivers.
   Refreshes every 10 s. Location data comes only from the staff API.
   ========================================================================== */
import { useCallback, useEffect, useState } from "react";
import { Bike, CheckCircle2, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { assignDriver, completeOutsideOrder, dispatchOutsideOrder, getDrivers, getOutsideOrders, whatsappNumber } from "../../api/outsideOrders";
import { useAuth } from "../../context/AuthContext";
import { errorText } from "../../utils/errors";
import { money, orderNo } from "../../utils/format";
import { googleDirectionsUrl, googleSearchUrl } from "../../utils/maps";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import LocationMap from "../../components/delivery/LocationMap";
import OwnerStatusControl from "../../components/delivery/OwnerStatusControl";
import { useToast } from "../../components/ui/Toast";
import { t as tr } from "../../i18n";
import { restaurantChannel, useLive } from "../../realtime";

export default function DeliveryBoard() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(null);
  const { can, user } = useAuth();
  // The delivery manager, owner and manager distribute orders; drivers only see theirs.
  const canAssign = can("dispatch_deliveries") || can("manage_orders") || can("view_payments");
  const [drivers, setDrivers] = useState([]);
  const [filter, setFilter] = useState("all");
  const load = useCallback(() => {
    getOutsideOrders("delivery").then((d) => setRows(d || [])).catch(() => {});
    if (canAssign) getDrivers().then((d) => setDrivers(d || [])).catch(() => {});
  }, [canAssign]);
  const shown = filter === "unassigned" ? rows.filter((o) => !o.driver) : rows;
  useEffect(() => { load(); }, [load]);
  useLive({ channel: restaurantChannel(user), isPrivate: true, topics: ["outside"], onSignal: load, pollMs: 10000 });

  async function act(o, fn, done) {
    setBusy(o.id);
    try { await fn(); toast.success(done); load(); } catch (e) { toast.error(errorText(e)); } finally { setBusy(null); }
  }

  return (
    <div>
      <PageHeader title={canAssign ? tr("إدارة التوصيل") : tr("طلباتي للتوصيل")}
        subtitle={canAssign ? tr("وزّع طلبات التوصيل المقبولة على السائقين، وتابعها حتى التسليم.") : tr("الطلبات المعيّنة لك، مع موقع الزبون والعنوان الذي كتبه.")}
        action={canAssign ? (
          <div className="flex gap-1 rounded-full bg-ink/[0.05] p-1 text-sm font-bold" role="group" aria-label={tr("التصفية")}>
            {[["all", tr("الكل ({0})", { 0: rows.length })], ["unassigned", tr("غير معيّن ({0})", { 0: rows.filter((o) => !o.driver).length })]].map(([v, l]) => (
              <button key={v} type="button" aria-pressed={filter === v} onClick={() => setFilter(v)} className={`rounded-full px-4 py-1.5 ${filter === v ? "bg-white shadow-sm" : "text-muted"}`}>{l}</button>
            ))}
          </div>
        ) : null} />
      {!shown.length ? (
        <Card><EmptyState icon={Bike} title={canAssign ? tr("لا توجد طلبات توصيل هنا") : tr("لا توجد طلبات معيّنة لك الآن")} description={canAssign ? tr("تظهر هنا طلبات التوصيل بعد قبولها من «الطلبات الخارجية».") : tr("عندما يعيّن لك مسؤول التوصيل طلبًا، يظهر هنا مباشرة.")} /></Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {shown.map((o) => {
            const c = o.customer || {};
            const loc = c.location;
            return (
              <li key={o.id}>
                <Card className="flex h-full flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-extrabold">{orderNo(o.order_number)} · {c.name}</p>
                      <p className="text-sm text-muted" dir="ltr">{c.phone}</p>
                    </div>
                    <Badge tone={o.fulfillment_status === "out_for_delivery" ? "info" : o.driver ? "success" : "warning"}>{o.fulfillment_status === "out_for_delivery" ? tr("خرج للتوصيل") : o.driver ? (canAssign ? tr("مع {0} · بانتظار الخروج", { 0: o.driver.name }) : tr("جاهز · اخرج للتوصيل")) : tr("جاهز · بانتظار تعيين سائق")}</Badge>
                  </div>

                  {canAssign ? (
                    <label className="flex items-center gap-2 rounded-xl border border-line p-2 text-sm font-bold">
                      <span className="shrink-0 text-muted">{tr("السائق")}</span>
                      <select aria-label={tr("السائق للطلب {0}", { 0: orderNo(o.order_number) })} value={o.driver?.id || ""} disabled={busy === o.id}
                        onChange={(e) => act(o, () => assignDriver(o.id, Number(e.target.value) || null), e.target.value ? tr("تم تعيين السائق.") : tr("أُلغي التعيين."))}
                        className={`h-10 min-w-0 flex-1 rounded-lg border px-2 ${o.driver ? "border-line bg-white" : "border-copper bg-copper/[0.06]"}`}>
                        <option value="">{tr("— غير معيّن —")}</option>
                        {drivers.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.active_orders} {tr("طلب حالي")}</option>)}
                      </select>
                    </label>
                  ) : null}
                  <OwnerStatusControl order={o} onChanged={load} />
                  {canAssign && !drivers.length && <p className="text-xs text-muted">{tr("لا يوجد سائقون بعد. أضفهم من «فريق المطعم» بدور «سائق توصيل».")}</p>}
                  {loc ? <LocationMap lat={loc.lat} lng={loc.lng} height={200} /> : (
                    <p className="flex items-center gap-2 rounded-xl bg-copper/10 p-3 text-xs font-bold text-copper-ink"><MapPin size={15} aria-hidden="true" /> {tr("لم يشارك الزبون موقعه. اعتمد على العنوان المكتوب.")}</p>
                  )}
                  <div className="rounded-xl bg-surface-2 p-3 text-sm">
                    <p className="text-xs font-bold text-muted">{tr("العنوان الذي كتبه الزبون")}{c.zone ? ` · ${c.zone}` : ""}</p>
                    <p className="mt-1 font-bold leading-6">{c.address}</p>
                    {c.notes && <p className="mt-1 text-xs font-bold text-copper-ink">{c.notes}</p>}
                    {loc?.accuracy ? <p className="mt-1 text-[11px] text-muted">{tr("دقة الموقع ≈")} {loc.accuracy} {tr("م")}</p> : null}
                  </div>

                  <ul className="text-sm">{o.items.map((i) => <li key={i.id}><b className="num">{i.quantity}×</b> {i.name}</li>)}</ul>
                  <p className="num text-sm font-black">{money(o.total)} · <span className="font-bold">{o.payment_method === "transfer" ? (o.payment_status === "paid" ? tr("مدفوع بالتحويل") : tr("تحويل · يحتاج تحقق")) : tr("تحصيل نقدي عند التسليم")}</span></p>

                  <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3">
                    <a href={loc ? googleDirectionsUrl(loc.lat, loc.lng) : googleSearchUrl(`${c.zone || ""} ${c.address || ""}`)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] bg-navy px-3 text-xs font-bold text-paper"><Navigation size={14} /> {loc ? tr("الاتجاهات في خرائط Google") : tr("ابحث عن العنوان")}</a>
                    <a href={`tel:${c.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-xs font-bold ring-1 ring-line"><Phone size={14} /> {tr("اتصال")}</a>
                    <a href={`https://wa.me/${whatsappNumber(c.phone)}?text=${encodeURIComponent(tr("مرحبًا {0}، أنا سائق التوصيل لطلبك {1}.", { 0: c.name, 1: orderNo(o.order_number) }))}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-xs font-bold text-[#1f7a52] ring-1 ring-line"><MessageCircle size={14} /> {tr("واتساب")}</a>
                    {o.fulfillment_status === "accepted" && (!canAssign || !drivers.length) && <Button size="sm" variant="dark" loading={busy === o.id} onClick={() => act(o, () => dispatchOutsideOrder(o.id), tr("خرج الطلب للتوصيل."))}><Bike size={15} /> {tr("خرج للتوصيل")}</Button>}
                    {o.fulfillment_status === "out_for_delivery" && (!canAssign || !drivers.length) && <Button size="sm" loading={busy === o.id} onClick={() => act(o, () => completeOutsideOrder(o.id), tr("تم تسليم الطلب."))}><CheckCircle2 size={15} /> {tr("تم التسليم")}</Button>}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
