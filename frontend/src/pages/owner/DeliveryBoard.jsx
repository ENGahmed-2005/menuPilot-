/* ==========================================================================
   DeliveryBoard.jsx — «التوصيل»: accepted delivery orders with the customer's
   map location (if shared) and typed address, for the restaurant's drivers.
   Refreshes every 10 s. Location data comes only from the staff API.
   ========================================================================== */
import { useCallback, useEffect, useState } from "react";
import { Bike, CheckCircle2, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { completeOutsideOrder, dispatchOutsideOrder, getOutsideOrders, whatsappNumber } from "../../api/outsideOrders";
import { errorText } from "../../utils/errors";
import { money, orderNo } from "../../utils/format";
import { googleDirectionsUrl, googleSearchUrl } from "../../utils/maps";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import LocationMap from "../../components/delivery/LocationMap";
import { useToast } from "../../components/ui/Toast";

export default function DeliveryBoard() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(null);
  const load = useCallback(() => getOutsideOrders("delivery").then((d) => setRows(d || [])).catch(() => {}), []);
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  async function act(o, fn, done) {
    setBusy(o.id);
    try { await fn(); toast.success(done); load(); } catch (e) { toast.error(errorText(e)); } finally { setBusy(null); }
  }

  return (
    <div>
      <PageHeader title="التوصيل" subtitle="طلبات التوصيل المقبولة مع موقع الزبون على الخريطة والعنوان الذي كتبه." />
      {!rows.length ? (
        <Card><EmptyState icon={Bike} title="لا توجد طلبات توصيل الآن" description="تظهر هنا طلبات التوصيل بعد قبولها من «الطلبات الخارجية»." /></Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {rows.map((o) => {
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
                    <Badge tone={o.fulfillment_status === "out_for_delivery" ? "info" : "warning"}>{o.fulfillment_status === "out_for_delivery" ? "خرج للتوصيل" : o.kitchen_status === "ready" ? "جاهز للتوصيل" : "قيد التحضير"}</Badge>
                  </div>

                  {loc ? <LocationMap lat={loc.lat} lng={loc.lng} height={200} /> : (
                    <p className="flex items-center gap-2 rounded-xl bg-copper/10 p-3 text-xs font-bold text-copper-ink"><MapPin size={15} aria-hidden="true" /> لم يشارك الزبون موقعه. اعتمد على العنوان المكتوب.</p>
                  )}
                  <div className="rounded-xl bg-surface-2 p-3 text-sm">
                    <p className="text-xs font-bold text-muted">العنوان الذي كتبه الزبون{c.zone ? ` · ${c.zone}` : ""}</p>
                    <p className="mt-1 font-bold leading-6">{c.address}</p>
                    {c.notes && <p className="mt-1 text-xs font-bold text-copper-ink">{c.notes}</p>}
                    {loc?.accuracy ? <p className="mt-1 text-[11px] text-muted">دقة الموقع ≈ {loc.accuracy} م</p> : null}
                  </div>

                  <ul className="text-sm">{o.items.map((i) => <li key={i.id}><b className="num">{i.quantity}×</b> {i.name}</li>)}</ul>
                  <p className="num text-sm font-black">{money(o.total)} · <span className="font-bold">{o.payment_method === "transfer" ? (o.payment_status === "paid" ? "مدفوع بالتحويل" : "تحويل · يحتاج تحقق") : "تحصيل نقدي عند التسليم"}</span></p>

                  <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3">
                    <a href={loc ? googleDirectionsUrl(loc.lat, loc.lng) : googleSearchUrl(`${c.zone || ""} ${c.address || ""}`)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] bg-navy px-3 text-xs font-bold text-paper"><Navigation size={14} /> {loc ? "الاتجاهات في خرائط Google" : "ابحث عن العنوان"}</a>
                    <a href={`tel:${c.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-xs font-bold ring-1 ring-line"><Phone size={14} /> اتصال</a>
                    <a href={`https://wa.me/${whatsappNumber(c.phone)}?text=${encodeURIComponent(`مرحبًا ${c.name}، أنا سائق التوصيل لطلبك ${orderNo(o.order_number)}.`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-xs font-bold text-[#1f7a52] ring-1 ring-line"><MessageCircle size={14} /> واتساب</a>
                    {o.fulfillment_status === "accepted" && <Button size="sm" variant="dark" loading={busy === o.id} onClick={() => act(o, () => dispatchOutsideOrder(o.id), "خرج الطلب للتوصيل.")}><Bike size={15} /> خرج للتوصيل</Button>}
                    {o.fulfillment_status === "out_for_delivery" && <Button size="sm" loading={busy === o.id} onClick={() => act(o, () => completeOutsideOrder(o.id), "تم تسليم الطلب.")}><CheckCircle2 size={15} /> تم التسليم</Button>}
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
