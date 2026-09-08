import { useEffect, useMemo, useState } from "react";
import { BellRing, Check, ChevronRight, Clock3, FileText, Loader2, Utensils, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useOrderTracking } from "../../hooks/useOrderTracking";
import { requestWaiterAssistance } from "../../api/sessions";
import { requestBill } from "../../api/billing";
import Spinner from "../../components/ui/Spinner";

const STATUS_META = {
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

const STATUS_ORDER = { pending: 0, preparing: 1, ready: 2, served: 3 };

function statusMeta(status) {
  return STATUS_META[status] || { label: status || "غير معروف", description: "يتم تحديث حالة طلبك." };
}

function OrderProgress({ status }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-brick/15 bg-brick/5 p-4 text-brick">
        <X size={18} />
        <span className="text-sm font-semibold">تم إلغاء هذا الطلب</span>
      </div>
    );
  }

  const current = STATUS_ORDER[status] ?? 0;
  return (
    <div className="mt-5 grid grid-cols-4 gap-2">
      {STEPS.map((step, index) => {
        const active = index <= current;
        return (
          <div key={step.key} className="min-w-0 text-center">
            <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold transition ${active ? "border-copper bg-copper text-ink" : "border-ink/10 bg-paper text-ink-soft/50"}`}>
              {active ? <Check size={16} strokeWidth={3} /> : index + 1}
            </div>
            <p className={`mt-2 truncate text-[10px] font-semibold sm:text-xs ${active ? "text-ink" : "text-ink-soft/50"}`}>{step.label}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function OrderTracking() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const { orders, loading, error } = useOrderTracking(sessionId);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const activeOrder = useMemo(
    () => orders.find((order) => order.status !== "served" && order.status !== "cancelled") || orders[orders.length - 1],
    [orders]
  );

  async function handleAskForHelp() {
    setBusy("help");
    try {
      await requestWaiterAssistance(sessionId);
      setNotice("تم إشعار النادل بطلب المساعدة.");
    } catch (err) {
      setNotice(err.message || "تعذّر إرسال طلب المساعدة.");
    } finally {
      setBusy("");
    }
  }

  async function handleRequestBill() {
    setBusy("bill");
    try {
      await requestBill(sessionId);
      setNotice("تم طلب الفاتورة وإشعار الكاشير.");
    } catch (err) {
      setNotice(err.message || "تعذّر طلب الفاتورة.");
    } finally {
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
    <main dir="rtl" className="min-h-screen bg-paper-2 pb-32 text-ink">
      <header className="bg-ink text-paper">
        <div className="mx-auto max-w-3xl px-5 pb-8 pt-6 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-copper text-ink"><Utensils size={20} /></div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.18em] text-copper">MENUPILOT</p>
                <p className="mt-0.5 text-xs text-paper/50">تتبع طلبك</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-paper/10 bg-paper/5 px-3 py-2 text-xs text-paper/65">
              <span className="h-2 w-2 animate-pulse rounded-full bg-herb" /> تحديث تلقائي
            </div>
          </div>
          <div className="mt-8">
            <p className="text-sm text-paper/50">جلسة الطعام #{sessionId}</p>
            <h1 className="mt-1 font-display text-4xl">طلبك في الطريق إليك</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
        {notice && (
          <div role="status" className="mb-5 flex items-center gap-3 rounded-2xl border border-herb/15 bg-herb/10 px-4 py-3 text-sm text-herb shadow-sm">
            <Check size={18} />
            <span>{notice}</span>
          </div>
        )}

        {orders.length === 0 ? (
          <section className="rounded-[2rem] border border-ink/10 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-copper/10 text-copper"><Clock3 /></div>
            <h2 className="mt-5 font-display text-3xl">لا توجد طلبات بعد</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-soft">عند إرسال أول طلب سيظهر هنا مباشرة مع تحديث حالته تلقائيًا.</p>
          </section>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const meta = statusMeta(order.status);
              const isActive = activeOrder?.id === order.id;
              return (
                <article key={order.id} className={`rounded-[2rem] border bg-white p-5 shadow-sm transition sm:p-6 ${isActive ? "border-copper/30 shadow-md" : "border-ink/10"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-ink-soft/60">
                        <span>طلب</span>
                        <span className="text-ink">#{order.orderNumber}</span>
                      </div>
                      <h2 className="mt-2 text-lg font-bold">{meta.label}</h2>
                      <p className="mt-1 text-sm leading-6 text-ink-soft">{meta.description}</p>
                    </div>
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-copper/10 text-copper">
                      {order.status === "ready" ? <BellRing size={20} /> : <Clock3 size={20} />}
                    </div>
                  </div>
                  <OrderProgress status={order.status} />
                </article>
              );
            })}
          </div>
        )}

        <section className="mt-6 rounded-[2rem] border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-paper"><FileText size={18} /></div>
            <div>
              <h2 className="font-bold">تحتاج شيئًا آخر؟</h2>
              <p className="mt-1 text-xs leading-5 text-ink-soft">يمكنك طلب مساعدة النادل أو إرسال طلب الفاتورة من هنا.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button onClick={handleAskForHelp} disabled={Boolean(busy)} className="flex items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-paper px-4 py-3.5 text-sm font-bold transition hover:border-ink/20 hover:bg-paper-2 disabled:cursor-not-allowed disabled:opacity-50">
              {busy === "help" ? <Loader2 size={18} className="animate-spin" /> : <BellRing size={18} />}
              طلب مساعدة النادل
            </button>
            <button onClick={handleRequestBill} disabled={Boolean(busy)} className="flex items-center justify-center gap-2 rounded-2xl bg-copper px-4 py-3.5 text-sm font-bold text-ink transition hover:bg-copper-deep disabled:cursor-not-allowed disabled:opacity-50">
              {busy === "bill" ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
              طلب الفاتورة
            </button>
          </div>
        </section>

        <div className="mt-5 flex items-center justify-center gap-1 text-xs text-ink-soft/50">
          <span>تحديث حالة الطلب تلقائيًا</span>
          <ChevronRight size={13} className="rotate-180" />
        </div>
      </div>
    </main>
  );
}
