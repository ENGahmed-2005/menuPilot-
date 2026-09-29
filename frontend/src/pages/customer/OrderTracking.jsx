import { useEffect, useMemo, useState } from "react";
import BrandLogo from "../../components/brand/Logo";
import { BellRing, Check, ChevronRight, Clock3, FileText, Loader2, Plus, Utensils, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOrderTracking } from "../../hooks/useOrderTracking";
import { getSession, leaveSession, requestWaiterAssistance } from "../../api/sessions";
import { requestBill } from "../../api/billing";
import Spinner from "../../components/ui/Spinner";

const STATUS_META = {
  // Pay-first flow: the kitchen starts after the cashier confirms the payment.
  payment_pending: { label: "بانتظار تأكيد الدفع", description: "سيؤكد الكاشير دفعتك خلال لحظات، ثم يبدأ المطبخ بتحضير طلبك." },
  pending: { label: "تم استلام الطلب", description: "المطبخ استلم طلبك وسيبدأ تحضيره قريبًا." },
  preparing: { label: "قيد التحضير", description: "طلبك الآن قيد التحضير في المطبخ." },
  ready: { label: "طلبك جاهز", description: "الطلب جاهز وسيتم تقديمه لك من فريق المطعم." },
  served: { label: "تم تقديم الطلب", description: "نتمنى لك وجبة شهية وتجربة جميلة!" },
  cancelled: { label: "تم إلغاء الطلب", description: "تم إلغاء هذا الطلب من قبل فريق المطعم." },
};

const STEPS = [
  { key: "pending", label: "تم الاستلام" },
  { key: "preparing", label: "قيد التحضير" },
  { key: "ready", label: "جاهز" },
  { key: "served", label: "تم التقديم" },
];

// payment_pending: no kitchen step is reached yet.
const STATUS_ORDER = { payment_pending: -1, pending: 0, preparing: 1, ready: 2, served: 3 };

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

function statusMeta(status) {
  const normalized = normalizeStatus(status);
  return STATUS_META[normalized] || { label: status || "غير معروف", description: "يتم تحديث حالة طلبك." };
}

function OrderProgress({ status }) {
  const normalized = normalizeStatus(status);
  if (normalized === "cancelled") {
    return <div className="flex items-center gap-3 rounded-2xl border border-brick/15 bg-brick/5 p-4 text-brick"><X size={18} /><span className="text-sm font-semibold">تم إلغاء هذا الطلب</span></div>;
  }

  const current = STATUS_ORDER[normalized] ?? 0;
  return (
    <div className="mt-5 grid grid-cols-4 gap-2">
      {STEPS.map((step, index) => {
        const active = index <= current;
        return <div key={step.key} className="min-w-0 text-center"><div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold transition ${active ? "border-copper bg-copper text-ink" : "border-ink/10 bg-paper text-muted"}`}>{active ? <Check size={16} strokeWidth={3} /> : index + 1}</div><p className={`mt-2 truncate text-xs font-semibold sm:text-xs ${active ? "text-ink" : "text-muted"}`}>{step.label}</p></div>;
      })}
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
    if (!window.confirm("إنهاء جلستك ومغادرة الطاولة؟ لن تستطيع إضافة طلبات لهذه الجلسة بعد ذلك.")) return;
    setLeaving(true);
    try {
      await leaveSession(sessionId);
      setSession((s) => ({ ...s, is_closed: true, closed_at: new Date().toISOString(), can_leave: false }));
    } catch (err) {
      window.alert(err.message || "تعذّر إنهاء الجلسة.");
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
      showNotice(request?.duplicate ? "طلبك السابق ما زال قيد المتابعة — النادل في الطريق." : "تم إشعار النادل بطلب المساعدة.");
    } catch (err) {
      showNotice(err.message || "تعذّر إرسال طلب المساعدة.", "error");
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
      showNotice(err.message || "تعذّر طلب الفاتورة.", "error");
      setBusy("");
    }
  }

  if (loading) return <Spinner label="جارِ تحديث حالة طلبك…" />;

  if (error) {
    return (
      <main dir="rtl" className="min-h-screen bg-paper-2 px-5 py-10 text-ink">
        <div className="mx-auto max-w-lg rounded-[2rem] border border-brick/10 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brick/10 text-brick"><X /></div>
          <h1 className="mt-5 font-display text-3xl">تعذّر تحميل الطلب</h1>
          <p role="alert" className="mt-2 text-sm leading-6 text-ink-soft">{error.message || "حدث خطأ غير متوقع."}</p>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-paper-2 pb-40 text-ink">
      <header className="bg-navy text-paper">
        <div className="mx-auto max-w-3xl px-5 pb-8 pt-6 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-copper text-ink"><Utensils size={20} /></div><div><BrandLogo on="dark" height={22} /><p className="mt-0.5 text-xs text-paper/70">تتبع طلبك</p></div></div>
            <div className="flex items-center gap-2 rounded-full border border-paper/10 bg-paper/5 px-3 py-2 text-xs text-paper/65"><span className="h-2 w-2 animate-pulse rounded-full bg-herb" /> تحديث تلقائي</div>
          </div>
          <div className="mt-8"><p className="text-sm text-paper/70">جلسة الطعام #{sessionId}</p><h1 className="mt-1 font-display text-4xl">{normalizedOrders.length > 1 ? `طلباتك (${normalizedOrders.length})` : "طلبك في الطريق إليك"}</h1></div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
        {notice && <div role="status" className={`mb-5 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-sm ${noticeType === "error" ? "border border-brick/15 bg-brick/10 text-brick" : "border border-herb/15 bg-herb/10 text-herb"}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-current/10">{noticeType === "error" ? <X size={16} /> : <Check size={16} />}</span><span>{notice}</span></div>}

        {normalizedOrders.length === 0 ? (
          <section className="rounded-[2rem] border border-ink/10 bg-white p-8 text-center shadow-sm"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-copper/10 text-copper"><Clock3 /></div><h2 className="mt-5 font-display text-3xl">لا توجد طلبات بعد</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-soft">عند إرسال أول طلب سيظهر هنا مباشرة مع تحديث حالته تلقائيًا.</p></section>
        ) : (
          <div className="space-y-4">
            {normalizedOrders.map((order) => {
              const meta = statusMeta(order.normalizedStatus);
              const isActive = activeOrder?.id === order.id;
              return <article key={order.id} className={`rounded-[2rem] border bg-white p-5 shadow-sm transition sm:p-6 ${isActive ? "border-copper/30 shadow-md" : "border-ink/10"}`}><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-bold text-muted"><span>طلب</span><span className="text-ink">#{order.orderNumber}</span></div><h2 className="mt-2 text-lg font-bold">{meta.label}</h2><p className="mt-1 text-sm leading-6 text-ink-soft">{meta.description}</p></div><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-copper/10 text-copper">{order.normalizedStatus === "ready" ? <BellRing size={20} /> : <Clock3 size={20} />}</div></div><OrderProgress status={order.normalizedStatus} /></article>;
            })}
          </div>
        )}

        <section className="mt-6 rounded-[2rem] border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy text-paper"><FileText size={18} /></div><div><h2 className="font-bold">تحتاج شيئًا آخر؟</h2><p className="mt-1 text-xs leading-5 text-ink-soft">يمكنك طلب مساعدة النادل أو إرسال طلب الفاتورة من هنا.</p></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button onClick={handleAskForHelp} disabled={Boolean(busy) || !sessionId} className="flex items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-paper px-4 py-3.5 text-sm font-bold transition hover:border-ink/20 hover:bg-paper-2 disabled:cursor-not-allowed disabled:opacity-50">{busy === "help" ? <Loader2 size={18} className="animate-spin" /> : <BellRing size={18} />}طلب مساعدة النادل</button>
            <button onClick={handleRequestBill} disabled={Boolean(busy) || !sessionId} className="flex items-center justify-center gap-2 rounded-2xl bg-copper px-4 py-3.5 text-sm font-bold text-ink transition hover:bg-copper-deep disabled:cursor-not-allowed disabled:opacity-50">{busy === "bill" ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}طلب الفاتورة</button>
          </div>
        </section>

        <div className="mt-5 flex items-center justify-center gap-1 text-xs text-muted"><span>تحديث حالة الطلب تلقائيًا</span><ChevronRight size={13} className="rotate-180" /></div>
      </div>

      {/* Order more without leaving the session: back to the same table's menu. */}
      {(canAddOrder || sessionClosed) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper-2/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            {sessionClosed ? (
              <p className="py-2 text-center text-sm font-bold text-muted">أُغلقت جلسة هذه الطاولة. شكرًا لزيارتك!</p>
            ) : (
              <>
                <button onClick={addAnotherOrder} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-navy text-base font-bold text-paper shadow-lg transition active:scale-[0.99]">
                  <Plus size={20} aria-hidden="true" /> إضافة طلب جديد
                </button>
                {session?.can_leave && (
                  <button onClick={leaveTable} disabled={leaving} className="mt-2 flex h-11 w-full items-center justify-center rounded-2xl border border-ink/15 bg-white text-sm font-bold text-ink disabled:opacity-60">
                    {leaving ? "جارٍ إنهاء الجلسة…" : "إنهاء الجلسة ومغادرة الطاولة"}
                  </button>
                )}
                <p className="mt-2 text-center text-xs leading-5 text-muted">
                  {session?.has_pending_payment
                    ? "دفعتك السابقة بانتظار تأكيد الكاشير. جهّز طلبك الجديد الآن، ويُرسَل بعد التأكيد مباشرة."
                    : "أضف أصنافًا أخرى لنفس الطاولة، وتظهر هنا مع طلباتك السابقة."}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
