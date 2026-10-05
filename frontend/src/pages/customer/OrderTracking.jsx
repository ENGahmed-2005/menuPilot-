/* ==========================================================================
   OrderTracking.jsx — the guest's order status (route /order-tracking).
   Each order: its number, a vertical timeline (received → preparing → ready
   → served; a pay-first order waits for the cashier first) and a summary of
   its dishes with their extras, category and price. Updates live; the guest
   can call the waiter, ask for the bill or order more for the same table.
   ========================================================================== */
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BellRing, Check, Clock3, FileText, Loader2, Plus, Utensils, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOrderTracking } from "../../hooks/useOrderTracking";
import { getSession, leaveSession, requestWaiterAssistance } from "../../api/sessions";
import { requestBill } from "../../api/billing";
import Spinner from "../../components/ui/Spinner";
import ItemOptions from "../../components/orders/ItemOptions";
import { money } from "../../utils/format";
import { t, dir } from "../../i18n";

const STATUS_META = {
  // Pay-first flow: the kitchen starts after the cashier confirms the payment.
  payment_pending: { label: t("بانتظار تأكيد الدفع"), description: t("سيؤكد الكاشير دفعتك خلال لحظات، ثم يبدأ المطبخ بتحضير طلبك.") },
  pending: { label: t("تم استلام الطلب"), description: t("المطبخ استلم طلبك وسيبدأ تحضيره قريبًا.") },
  preparing: { label: t("قيد التحضير"), description: t("طلبك الآن قيد التحضير في المطبخ.") },
  ready: { label: t("طلبك جاهز"), description: t("الطلب جاهز وسيتم تقديمه لك من فريق المطعم.") },
  served: { label: t("تم تقديم الطلب"), description: t("نتمنى لك وجبة شهية وتجربة جميلة!") },
  cancelled: { label: t("تم إلغاء الطلب"), description: t("تم إلغاء هذا الطلب من قبل فريق المطعم.") },
};

const STEPS = [
  { key: "pending", label: t("تم استلام الطلب") },
  { key: "preparing", label: t("المطبخ يحضّر طلبك") },
  { key: "ready", label: t("جاهز") },
  { key: "served", label: t("تم التقديم") },
];
const PAYMENT_STEP = { key: "payment_pending", label: t("بانتظار تأكيد الدفع") };

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function statusMeta(status) {
  const normalized = normalizeStatus(status);
  return STATUS_META[normalized] || { label: status || t("غير معروف"), description: t("يتم تحديث حالة طلبك.") };
}

/* Done steps: a filled circle with a check; the current one: a filled dot
   with a soft ring; the rest: hollow. The line between them fills as it goes. */
function OrderTimeline({ status }) {
  if (status === "cancelled") {
    return <div className="mt-5 flex items-center gap-3 rounded-2xl border border-brick/15 bg-brick/5 p-4 text-brick"><X size={18} aria-hidden="true" /><span className="text-sm font-semibold">{t("تم إلغاء هذا الطلب")}</span></div>;
  }
  const steps = status === "payment_pending" ? [PAYMENT_STEP, ...STEPS] : STEPS;
  const current = Math.max(0, steps.findIndex((step) => step.key === status));
  const finished = status === "served";

  return (
    <ol className="mt-5" aria-label={t("مراحل الطلب")}>
      {steps.map((step, index) => {
        const done = index < current || finished;
        const now = index === current && !finished;
        return (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0" aria-current={now ? "step" : undefined}>
            {index < steps.length - 1 && <span aria-hidden="true" className={`absolute start-[11px] top-6 bottom-0 w-0.5 ${index < current || finished ? "bg-navy" : "bg-ink/15"}`} />}
            <span aria-hidden="true" className={`relative grid h-6 w-6 shrink-0 place-items-center rounded-full ${done ? "bg-navy text-paper" : now ? "bg-navy ring-4 ring-navy/15" : "border-2 border-ink/20 bg-white"}`}>
              {done && <Check size={14} strokeWidth={3} />}
              {now && <span className="h-2 w-2 rounded-full bg-paper motion-safe:animate-pulse" />}
            </span>
            <span className={`pt-0.5 text-[15px] leading-5 ${now ? "font-black text-ink" : done ? "font-bold text-ink" : "text-muted"}`}>
              {step.label}
              {done && <span className="sr-only"> — {t("تم")}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Thumb({ src, alt }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-copper/10 text-copper" aria-hidden="true"><Utensils size={18} /></span>;
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="h-12 w-12 shrink-0 rounded-xl object-cover" />;
}

/* The order's dishes; cancelled ones are struck through and left out of the total. */
function OrderSummary({ items = [] }) {
  if (!items.length) return null;
  const active = (item) => item.status !== "cancelled";
  const total = items.filter(active).reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0);
  return (
    <div className="mt-6 border-t border-line pt-5">
      <h3 className="text-base font-black">{t("ملخص الطلب")}</h3>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <Thumb src={item.image_url} alt={item.name} />
            <div className="min-w-0 flex-1">
              <p className={`text-[15px] font-bold leading-6 ${active(item) ? "" : "text-muted line-through"}`}>
                {Number(item.quantity) > 1 && <span className="tabular-nums text-muted">{item.quantity}× </span>}{item.name}
              </p>
              <ItemOptions options={item.options} />
              {item.note && <p className="text-xs leading-5 text-muted">{item.note}</p>}
              {item.category && <span className="mt-1 inline-block rounded-full bg-copper/10 px-2.5 py-0.5 text-[11px] font-bold text-copper-ink">{item.category}</span>}
            </div>
            <span className={`shrink-0 pt-0.5 text-[15px] font-black tabular-nums ${active(item) ? "" : "text-muted line-through"}`}>{money(Number(item.unit_price || 0) * Number(item.quantity || 0))}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-lg font-black">
        <span>{t("الإجمالي")}</span>
        <span className="tabular-nums">{money(total)}</span>
      </div>
    </div>
  );
}

export default function OrderTracking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session");
  const { orders, loading, error } = useOrderTracking(sessionId);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [busy, setBusy] = useState("");
  // The guest's own session: table code (to go back to the same menu) and
  // whether a previous payment is still waiting for the cashier.
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!sessionId) return undefined;
    let active = true;
    const load = () => getSession(sessionId).then((data) => active && setSession(data)).catch(() => {});
    load();
    const timer = setInterval(load, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [sessionId]);

  const tableCode = session?.table_code || session?.tableCode;
  const sessionClosed = Boolean(session?.is_closed || session?.closed_at);
  const canAddOrder = Boolean(tableCode) && !sessionClosed;

  const [leaving, setLeaving] = useState(false);
  async function leaveTable() {
    if (!window.confirm(t("إنهاء جلستك ومغادرة الطاولة؟ لن تستطيع إضافة طلبات لهذه الجلسة بعد ذلك."))) return;
    setLeaving(true);
    try {
      await leaveSession(sessionId);
      setSession((s) => ({ ...s, is_closed: true, closed_at: new Date().toISOString(), can_leave: false }));
    } catch (err) {
      window.alert(err.message || t("تعذّر إنهاء الجلسة."));
    } finally {
      setLeaving(false);
    }
  }

  function addAnotherOrder() {
    navigate(`/t/${encodeURIComponent(tableCode)}/menu?session=${encodeURIComponent(sessionId)}&more=1`);
  }

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const normalizedOrders = useMemo(
    () => orders.map((order) => ({ ...order, normalizedStatus: normalizeStatus(order.status) })),
    [orders]
  );

  const activeOrder = useMemo(
    () => normalizedOrders.find((order) => order.normalizedStatus !== "served" && order.normalizedStatus !== "cancelled") || normalizedOrders[normalizedOrders.length - 1],
    [normalizedOrders]
  );

  function showNotice(message, type = "success") {
    setNoticeType(type);
    setNotice(message);
  }

  async function handleAskForHelp() {
    if (!sessionId) return;
    setBusy("help");
    try {
      const request = await requestWaiterAssistance(sessionId);
      showNotice(request?.duplicate ? t("طلبك السابق ما زال قيد المتابعة — النادل في الطريق.") : t("تم إشعار النادل بطلب المساعدة."));
    } catch (err) {
      showNotice(err.message || t("تعذّر إرسال طلب المساعدة."), "error");
    } finally {
      setBusy("");
    }
  }

  async function handleRequestBill() {
    if (!sessionId) return;
    setBusy("bill");
    try {
      await requestBill(sessionId);
      navigate(`/bill-request?session=${encodeURIComponent(sessionId)}`, { replace: true });
    } catch (err) {
      showNotice(err.message || t("تعذّر طلب الفاتورة."), "error");
      setBusy("");
    }
  }

  if (loading) return <Spinner label={t("جارِ تحديث حالة طلبك…")} />;

  if (error) {
    return (
      <main dir={dir} className="min-h-screen bg-paper-2 px-5 py-10 text-ink">
        <div className="mx-auto max-w-lg rounded-[2rem] border border-brick/10 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brick/10 text-brick"><X /></div>
          <h1 className="mt-5 font-display text-3xl">{t("تعذّر تحميل الطلب")}</h1>
          <p role="alert" className="mt-2 text-sm leading-6 text-ink-soft">{error.message || t("حدث خطأ غير متوقع.")}</p>
        </div>
      </main>
    );
  }

  return (
    <main dir={dir} className="min-h-screen bg-paper-2 pb-40 text-ink">
      <header className="sticky top-0 z-30 bg-navy text-paper shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button onClick={() => (tableCode ? addAnotherOrder() : navigate(-1))} aria-label={tableCode ? t("العودة للقائمة") : t("رجوع")} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-paper/10">
            <ArrowRight size={20} aria-hidden="true" />
          </button>
          <h1 className="flex-1 text-center text-lg font-black">{t("حالة الطلب")}</h1>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center" title={t("تحديث تلقائي")}>
            <span className="h-2.5 w-2.5 rounded-full bg-herb motion-safe:animate-pulse" aria-hidden="true" />
            <span className="sr-only">{t("تحديث تلقائي")}</span>
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
        {notice && <div role="status" className={`mb-5 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-sm ${noticeType === "error" ? "border border-brick/15 bg-brick/10 text-brick" : "border border-herb/15 bg-herb/10 text-herb"}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-current/10">{noticeType === "error" ? <X size={16} /> : <Check size={16} />}</span><span>{notice}</span></div>}

        {normalizedOrders.length === 0 ? (
          <section className="rounded-[2rem] border border-ink/10 bg-white p-8 text-center shadow-sm"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-copper/10 text-copper"><Clock3 /></div><h2 className="mt-5 font-display text-3xl">{t("لا توجد طلبات بعد")}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-soft">{t("عند إرسال أول طلب سيظهر هنا مباشرة مع تحديث حالته تلقائيًا.")}</p></section>
        ) : (
          <div className="space-y-4">
            {normalizedOrders.map((order) => {
              const meta = statusMeta(order.normalizedStatus);
              const isActive = activeOrder?.id === order.id;
              return (
                <article key={order.id} className={`rounded-[1.75rem] border bg-white p-5 shadow-sm transition sm:p-6 ${isActive ? "border-copper/30 shadow-md" : "border-ink/10"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black">{t("طلب")} <span className="tabular-nums">#{order.orderNumber}</span></h2>
                      <p className="mt-1 text-sm leading-6 text-ink-soft">{meta.description}</p>
                    </div>
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-copper/10 text-copper" aria-hidden="true">{order.normalizedStatus === "ready" ? <BellRing size={20} /> : <Clock3 size={20} />}</div>
                  </div>
                  <OrderTimeline status={order.normalizedStatus} />
                  <OrderSummary items={order.items} />
                </article>
              );
            })}
          </div>
        )}

        <section className="mt-6 rounded-[2rem] border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy text-paper"><FileText size={18} /></div><div><h2 className="font-bold">{t("تحتاج شيئًا آخر؟")}</h2><p className="mt-1 text-xs leading-5 text-ink-soft">{t("يمكنك طلب مساعدة النادل أو إرسال طلب الفاتورة من هنا.")}</p></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button onClick={handleAskForHelp} disabled={Boolean(busy) || !sessionId} className="flex items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-paper px-4 py-3.5 text-sm font-bold transition hover:border-ink/20 hover:bg-paper-2 disabled:cursor-not-allowed disabled:opacity-50">{busy === "help" ? <Loader2 size={18} className="animate-spin" /> : <BellRing size={18} />}{t("طلب مساعدة النادل")}</button>
            <button onClick={handleRequestBill} disabled={Boolean(busy) || !sessionId} className="flex items-center justify-center gap-2 rounded-2xl bg-copper px-4 py-3.5 text-sm font-bold text-ink transition hover:bg-copper-deep disabled:cursor-not-allowed disabled:opacity-50">{busy === "bill" ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}{t("طلب الفاتورة")}</button>
          </div>
        </section>

      </div>

      {/* Order more without leaving the session: back to the same table's menu. */}
      {(canAddOrder || sessionClosed) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper-2/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            {sessionClosed ? (
              <p className="py-2 text-center text-sm font-bold text-muted">{t("أُغلقت جلسة هذه الطاولة. شكرًا لزيارتك!")}</p>
            ) : (
              <>
                <button onClick={addAnotherOrder} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-navy text-base font-bold text-paper shadow-lg transition active:scale-[0.99]">
                  <Plus size={20} aria-hidden="true" /> {t("إضافة طلب جديد")}
                </button>
                {session?.can_leave && (
                  <button onClick={leaveTable} disabled={leaving} className="mt-2 flex h-11 w-full items-center justify-center rounded-2xl border border-ink/15 bg-white text-sm font-bold text-ink disabled:opacity-60">
                    {leaving ? t("جارٍ إنهاء الجلسة…") : t("إنهاء الجلسة ومغادرة الطاولة")}
                  </button>
                )}
                <p className="mt-2 text-center text-xs leading-5 text-muted">
                  {session?.has_pending_payment
                    ? t("دفعتك السابقة بانتظار تأكيد الكاشير. جهّز طلبك الجديد الآن، ويُرسَل بعد التأكيد مباشرة.")
                    : t("أضف أصنافًا أخرى لنفس الطاولة، وتظهر هنا مع طلباتك السابقة.")}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
