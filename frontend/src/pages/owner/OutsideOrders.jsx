/* ==========================================================================
   OutsideOrders.jsx — «الطلبات الخارجية» inbox (pickup / delivery).
   New orders need a manual accept (with prep time) or a reject (reason).
   Plays a short tone when a new order arrives. Refreshes every 8 s.
   ========================================================================== */
import { useCallback, useEffect, useRef, useState } from "react";
import { Bike, Check, ExternalLink, MapPin, MessageCircle, Phone, Store, X } from "lucide-react";
import { googleDirectionsUrl } from "../../utils/maps";
import { acceptOutsideOrder, completeOutsideOrder, dispatchOutsideOrder, getOutsideOrders, rejectOutsideOrder, verifyOutsidePayment, whatsappNumber } from "../../api/outsideOrders";
import { errorText } from "../../utils/errors";
import { money, orderNo } from "../../utils/format";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import SegmentedControl from "../../components/ui/SegmentedControl";
import { useToast } from "../../components/ui/Toast";

const STATE = { awaiting_acceptance: ["بانتظار موافقتك", "warning"], accepted: ["مقبول", "info"], out_for_delivery: ["خرج للتوصيل", "info"], completed: ["مكتمل", "success"], rejected: ["مرفوض", "danger"] };
const ago = (iso) => { const m = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 60000)); return m < 1 ? "الآن" : `منذ ${m} د`; };

function beep() {
  try { const c = new (window.AudioContext || window.webkitAudioContext)(); const o = c.createOscillator(); const g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = 0.08; o.start(); o.stop(c.currentTime + 0.25); } catch { /* sound is optional */ }
}

export default function OutsideOrders() {
  const toast = useToast();
  const [tab, setTab] = useState("active");
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(null);
  const seen = useRef(null);

  const load = useCallback(() => getOutsideOrders(tab).then((d) => {
    setRows(d || []);
    const waiting = (d || []).filter((o) => o.fulfillment_status === "awaiting_acceptance").map((o) => o.id);
    if (seen.current && waiting.some((id) => !seen.current.includes(id))) { beep(); toast.info("وصل طلب خارجي جديد"); }
    seen.current = waiting;
  }).catch(() => {}), [tab, toast]);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  async function act(o, fn, done) {
    setBusy(o.id);
    try { await fn(); toast.success(done); load(); } catch (e) { toast.error(errorText(e)); } finally { setBusy(null); }
  }
  const accept = (o) => { const m = window.prompt("وقت التحضير بالدقائق:", "20"); if (m) act(o, () => acceptOutsideOrder(o.id, Number(m) || 20), "قُبل الطلب وأُرسل للمطبخ."); };
  const reject = (o) => { const r = window.prompt("سبب الرفض (يظهر للزبون):", "نعتذر، لا نستطيع تجهيز الطلب الآن"); if (r && r.trim().length > 1) act(o, () => rejectOutsideOrder(o.id, r.trim()), "رُفض الطلب."); };

  return (
    <div>
      <PageHeader title="الطلبات الخارجية" subtitle="طلبات الاستلام والتوصيل من رابط المطعم. اقبل الطلب ليصل للمطبخ." action={<SegmentedControl label="التصفية" value={tab} onChange={setTab} options={[{ value: "active", label: "الحالية" }, { value: "awaiting", label: "بانتظار الموافقة" }, { value: "done", label: "المنتهية" }]} />} />
      {!rows.length ? (
        <Card><EmptyState icon={Bike} title="لا توجد طلبات هنا" description="تظهر طلبات الاستلام والتوصيل هنا لحظة إرسالها، مع تنبيه صوتي." /></Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {rows.map((o) => (
            <li key={o.id}>
              <Card className={`flex h-full flex-col p-4 ${o.fulfillment_status === "awaiting_acceptance" ? "border-copper ring-2 ring-copper/25" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-lg font-extrabold">{o.channel === "delivery" ? <Bike size={18} aria-hidden="true" /> : <Store size={18} aria-hidden="true" />}{orderNo(o.order_number)} · {o.channel === "delivery" ? "توصيل" : "استلام"}</p>
                    <p className="mt-0.5 text-sm text-muted">{o.customer?.name} · <span dir="ltr">{o.customer?.phone}</span> · {ago(o.submitted_at)}</p>
                    {o.channel === "delivery" && <p className="mt-1 text-sm"><b>{o.customer?.zone}</b> — {o.customer?.address}{o.customer?.location && <a href={googleDirectionsUrl(o.customer.location.lat, o.customer.location.lng)} target="_blank" rel="noopener noreferrer" className="mr-2 inline-flex items-center gap-1 text-xs font-bold text-copper-ink"><MapPin size={12} /> الموقع</a>}</p>}
                    {o.customer?.notes && <p className="mt-1 text-xs font-bold text-copper-ink">{o.customer.notes}</p>}
                  </div>
                  <Badge tone={STATE[o.fulfillment_status]?.[1]}>{STATE[o.fulfillment_status]?.[0]}</Badge>
                </div>
                <ul className="mt-3 flex-1 space-y-1 text-sm">{o.items.map((i) => <li key={i.id}><b className="num">{i.quantity}×</b> {i.name}{i.note && <span className="text-xs text-copper-ink"> — {i.note}</span>}</li>)}</ul>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
                  <span className="num font-black">{money(o.total)}{o.delivery_fee > 0 && <span className="text-xs font-medium text-muted"> (منها توصيل {money(o.delivery_fee)})</span>}</span>
                  <span className="text-xs font-bold">{o.payment_method === "transfer" ? (o.payment_status === "paid" ? "تحويل ✓" : "تحويل · يحتاج تحقق") : "نقدًا"}{o.payment_proof_url && <a href={o.payment_proof_url} target="_blank" rel="noopener noreferrer" className="mr-2 inline-flex items-center gap-1 text-copper-ink">الإشعار <ExternalLink size={12} /></a>}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.fulfillment_status === "awaiting_acceptance" && <>
                    <Button size="sm" loading={busy === o.id} onClick={() => accept(o)}><Check size={15} /> قبول</Button>
                    <Button size="sm" variant="secondary" disabled={busy === o.id} onClick={() => reject(o)}><X size={15} /> رفض</Button>
                  </>}
                  {o.payment_method === "transfer" && o.payment_status !== "paid" && !["rejected", "completed"].includes(o.fulfillment_status) && <Button size="sm" variant="secondary" disabled={busy === o.id} onClick={() => act(o, () => verifyOutsidePayment(o.id), "تأكد وصول التحويل.")}>تأكيد التحويل</Button>}
                  {o.channel === "delivery" && o.fulfillment_status === "accepted" && <Button size="sm" variant="dark" disabled={busy === o.id} onClick={() => act(o, () => dispatchOutsideOrder(o.id), "خرج الطلب للتوصيل.")}><Bike size={15} /> خرج للتوصيل</Button>}
                  {["accepted", "out_for_delivery"].includes(o.fulfillment_status) && <Button size="sm" variant="dark" disabled={busy === o.id} onClick={() => act(o, () => completeOutsideOrder(o.id), "اكتمل الطلب.")}>{o.channel === "delivery" ? "تم التسليم" : "تم الاستلام"}</Button>}
                  {o.customer?.phone && <a href={`https://wa.me/${whatsappNumber(o.customer.phone)}?text=${encodeURIComponent(`مرحبًا ${o.customer.name}، بخصوص طلبك ${orderNo(o.order_number)}.`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-xs font-bold text-[#1f7a52] hover:bg-herb/10"><MessageCircle size={15} /> واتساب</a>}
                  {o.customer?.phone && <a href={`tel:${o.customer.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-xs font-bold hover:bg-ink/[0.05]"><Phone size={15} /> اتصال</a>}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
