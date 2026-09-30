/* ==========================================================================
   OnlineOrderTracking.jsx — customer tracking for pickup/delivery orders
   (route /o/:id?token=). Refreshes every 5 s from the API.
   ========================================================================== */
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Check, Clock3, MessageCircle, Phone, Printer, XCircle } from "lucide-react";
import { waLink } from "../../utils/whatsapp";
import { trackOnlineOrder } from "../../api/outsideOrders";
import { errorText } from "../../utils/errors";
import { money, orderNo } from "../../utils/format";

const STEPS = {
  pickup: [["awaiting_acceptance", "استُلم طلبك"], ["accepted", "قبِل المطعم الطلب"], ["preparing", "قيد التحضير"], ["ready", "جاهز للاستلام"], ["completed", "تم الاستلام"]],
  delivery: [["awaiting_acceptance", "استُلم طلبك"], ["accepted", "قبِل المطعم الطلب"], ["preparing", "قيد التحضير"], ["ready", "جاهز · يُسلَّم للسائق"], ["out_for_delivery", "خرج للتوصيل"], ["completed", "تم التسليم"]],
};

const clock = (iso) => (iso ? new Date(iso).toLocaleTimeString("ar-PS-u-nu-latn", { hour: "2-digit", minute: "2-digit" }) : null);
// When each step happened (from the API timestamps).
const stepTime = (o, key) => ({ awaiting_acceptance: o.submitted_at, accepted: o.accepted_at, ready: o.ready_at, out_for_delivery: o.dispatched_at, completed: o.completed_at }[key]);

/** Invoice text the customer sends to the restaurant on WhatsApp. */
function invoiceText(o, link) {
  const lines = [
    `مرحبًا ${o.restaurant?.name || ""} 👋`,
    `أؤكد طلبي رقم ${orderNo(o.order_number)} (${o.channel === "delivery" ? "توصيل" : "استلام"})`,
    ...o.items.map((i) => `• ${i.quantity}× ${i.name} — ${money(i.quantity * i.unit_price)}`),
    ...(o.delivery_fee > 0 ? [`التوصيل: ${money(o.delivery_fee)}`] : []),
    `الإجمالي: ${money(o.total)}`,
    `الدفع: ${o.payment_method === "transfer" ? "تحويل مسبق" : o.channel === "delivery" ? "نقدًا عند التوصيل" : "نقدًا عند الاستلام"}`,
    ...(o.customer?.name ? [`الاسم: ${o.customer.name}`] : []),
    ...(o.customer?.address ? [`العنوان: ${o.customer.zone ? o.customer.zone + " — " : ""}${o.customer.address}`] : []),
    `رابط التتبع: ${link}`,
  ];
  return lines.join("\n");
}

function stepIndex(o) {
  if (o.fulfillment_status === "completed") return 6; // every step done
  if (o.channel === "delivery") {
    if (o.fulfillment_status === "out_for_delivery") return 4;
    if (o.fulfillment_status === "accepted") return o.kitchen_status === "ready" || o.kitchen_status === "served" ? 3 : o.kitchen_status === "preparing" ? 2 : 1;
    return 0;
  }
  if (o.fulfillment_status === "out_for_delivery" || (o.channel === "pickup" && o.kitchen_status === "ready")) return 3;
  if (o.fulfillment_status === "accepted") return o.kitchen_status === "preparing" || o.kitchen_status === "ready" ? 2 : 1;
  return 0;
}

export default function OnlineOrderTracking() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [o, setO] = useState(null);
  const [error, setError] = useState(null);
  const token = params.get("token") || "";

  useEffect(() => {
    const load = () => trackOnlineOrder(id, token).then((d) => { setO(d); setError(null); }).catch(setError);
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [id, token]);

  if (error && !o) return <main dir="rtl" className="grid min-h-screen place-items-center bg-paper-2 p-6 text-center font-bold text-brick">{errorText(error, "رابط التتبع غير صالح.")}</main>;
  if (!o) return <main dir="rtl" className="min-h-screen bg-paper-2 p-6"><div className="mx-auto h-64 max-w-lg animate-pulse rounded-3xl bg-black/[0.06]" /></main>;

  const steps = STEPS[o.channel] || STEPS.pickup;
  const at = stepIndex(o);
  return (
    <main dir="rtl" className="min-h-screen bg-paper-2 pb-10 text-ink">
      <header className="bg-navy text-paper"><div className="mx-auto max-w-lg px-5 py-6">
        <p className="text-sm text-paper/75">{o.restaurant?.name}</p>
        <h1 className="mt-1 text-2xl font-black">طلب {orderNo(o.order_number)} · {o.channel === "delivery" ? "توصيل" : "استلام"}</h1>
      </div></header>
      <div className="mx-auto max-w-lg space-y-4 px-5 pt-5">
        {o.fulfillment_status === "rejected" ? (
          <div role="alert" className="flex gap-3 rounded-2xl bg-brick/10 p-4 text-brick"><XCircle aria-hidden="true" /><div><p className="font-black">اعتذر المطعم عن الطلب</p><p className="mt-1 text-sm text-ink-soft">{o.rejection_reason}</p></div></div>
        ) : (
          <ol className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5" aria-label="حالة الطلب">
            {steps.map(([key, label], i) => (
              <li key={key} className="flex items-center gap-3 py-2">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black ${i < at ? "bg-herb text-white" : i === at ? "bg-copper text-ink" : "bg-black/[0.06] text-muted"}`}>{i < at ? <Check size={16} /> : i + 1}</span>
                <span className={`flex-1 text-sm ${i <= at ? "font-black" : "text-muted"}`}>{label}{i === 1 && o.prep_minutes && at >= 1 ? ` · التحضير ≈ ${o.prep_minutes} د` : ""}</span>
                {i <= at && stepTime(o, key) && <span className="num text-xs text-muted">{clock(stepTime(o, key))}</span>}
              </li>
            ))}
          </ol>
        )}
        {o.eta_at && at >= 1 && at < 4 && o.fulfillment_status !== "rejected" && (
          <p className="flex items-center gap-2 rounded-2xl bg-copper/10 p-3 text-sm font-bold text-copper-ink"><Clock3 size={17} aria-hidden="true" />
            {o.channel === "delivery" ? "يخرج للتوصيل" : "جاهز للاستلام"} تقريبًا الساعة <span className="num">{clock(o.eta_at)}</span></p>
        )}
        {o.restaurant?.whatsapp && o.fulfillment_status !== "rejected" && (
          <a href={waLink(o.restaurant.whatsapp, invoiceText(o, window.location.href))} target="_blank" rel="noopener noreferrer" className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#1f9d55] text-base font-black text-white shadow-sm print:hidden">
            <MessageCircle size={20} aria-hidden="true" /> تأكيد الطلب والفاتورة على واتساب
          </a>
        )}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <p className="mb-2 text-sm font-black">الفاتورة · {orderNo(o.order_number)}</p>
          <ul className="divide-y divide-line text-sm">{o.items.map((i) => <li key={i.id} className="flex justify-between py-2"><span><b className="num">{i.quantity}×</b> {i.name}</span><span className="num">{money(i.quantity * i.unit_price)}</span></li>)}</ul>
          <dl className="mt-3 space-y-1 border-t border-dashed border-line pt-3 text-sm">
            {o.delivery_fee > 0 && <div className="flex justify-between"><dt>التوصيل</dt><dd className="num">{money(o.delivery_fee)}</dd></div>}
            <div className="flex justify-between text-base font-black"><dt>الإجمالي</dt><dd className="num">{money(o.total)}</dd></div>
            <div className="flex justify-between text-muted"><dt>الدفع</dt><dd>{o.payment_method === "transfer" ? (o.payment_status === "paid" ? "تحويل · مؤكد" : "تحويل · قيد التحقق") : (o.payment_status === "paid" ? "نقدًا · مدفوع" : "نقدًا عند " + (o.channel === "delivery" ? "التوصيل" : "الاستلام"))}</dd></div>
          </dl>
        </section>
        <div className="grid grid-cols-2 gap-2 print:hidden">
          {o.restaurant?.phone && <a href={`tel:${o.restaurant.phone}`} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold ring-1 ring-black/10"><Phone size={16} aria-hidden="true" /> اتصل بالمطعم</a>}
          <button onClick={() => window.print()} className={`flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold ring-1 ring-black/10 ${o.restaurant?.phone ? "" : "col-span-2"}`}><Printer size={16} aria-hidden="true" /> حفظ الفاتورة</button>
        </div>
        <p className="text-center text-xs text-muted">احفظ هذا الرابط لمتابعة طلبك. تتحدث الحالة تلقائيًا.</p>
      </div>
    </main>
  );
}
