import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, CreditCard, Loader2, Receipt, RefreshCw, WalletCards } from "lucide-react";
import { getBill, recordPayment } from "../../api/billing";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";

const PAYMENT_METHODS = [
  { value: "cash", label: "نقدًا", description: "الدفع المباشر عند الكاشير" },
  { value: "electronic", label: "إلكتروني", description: "بطاقة أو وسيلة دفع إلكترونية" },
  { value: "ussd", label: "USSD", description: "قناة دفع بديلة دون اتصال" },
];

const money = (value) => {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("ar-PS", { maximumFractionDigits: 2 })} ₪`;
};

export default function Billing() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [method, setMethod] = useState("cash");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function loadBill(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setBill(await getBill(sessionId));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadBill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function handleConfirmPayment() {
    setSubmitting(true);
    setError(null);
    try {
      await recordPayment(sessionId, method);
      setBill((previous) => ({ ...previous, status: "Paid" }));
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  const subtotal = useMemo(
    () => (bill?.items || []).reduce((sum, item) => sum + Number(item.total || 0), 0),
    [bill]
  );

  if (loading) return <Spinner label="جارِ تحميل الفاتورة…" />;

  if (error && !bill) {
    return (
      <div dir="rtl" className="mx-auto max-w-xl">
        <PageHeader title="الفاتورة" subtitle={`جلسة #${sessionId}`} />
        <Card className="border-brick/15 bg-brick/5 p-7 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brick/10 text-brick">!</div>
          <h2 className="mt-4 text-xl font-bold">تعذّر تحميل الفاتورة</h2>
          <p role="alert" className="mt-2 text-sm leading-6 text-ink-soft">{error.message || "حدث خطأ غير متوقع."}</p>
          <button onClick={() => loadBill()} className="mt-5 rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-paper">
            حاول مرة أخرى
          </button>
        </Card>
      </div>
    );
  }

  if (!bill) return null;

  const paid = bill.status === "Paid";

  return (
    <div dir="rtl" className="mx-auto max-w-3xl pb-8">
      <PageHeader
        title="مراجعة الفاتورة"
        subtitle={`جلسة #${sessionId}`}
        action={
          <button
            onClick={() => loadBill(true)}
            disabled={refreshing || paid}
            className="flex items-center gap-2 rounded-xl border border-ink/10 px-3.5 py-2 text-sm font-bold transition hover:bg-ink/[0.04] disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            تحديث
          </button>
        }
      />

      {error && (
        <div role="alert" className="mb-5 rounded-2xl border border-brick/15 bg-brick/10 px-4 py-3 text-sm text-brick">
          {error.message || "تعذر تنفيذ العملية."}
        </div>
      )}

      {paid && (
        <Card className="mb-5 overflow-hidden border-herb/20 bg-herb/5">
          <div className="flex items-center gap-3 p-5">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-herb/10 text-herb">
              <CheckCircle2 size={23} />
            </span>
            <div>
              <h2 className="font-bold text-herb">تم تسجيل الدفع بنجاح</h2>
              <p className="mt-1 text-xs text-ink-soft/60">تم إغلاق الجلسة وأصبحت الطاولة متاحة من جهة النظام.</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.45fr_0.85fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink/10 bg-ink/[0.025] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-copper/10 text-copper"><Receipt size={17} /></span>
              <div>
                <h2 className="text-sm font-bold">بنود الفاتورة</h2>
                <p className="text-[11px] text-ink-soft/50">{bill.items.length} بنود</p>
              </div>
            </div>
            <span className="text-xs text-ink-soft/50">#{sessionId}</span>
          </div>

          <div className="divide-y divide-ink/10">
            {bill.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{item.name}</p>
                  <p className="mt-1 text-xs text-ink-soft/55">الكمية: {item.quantity}</p>
                </div>
                <span className="shrink-0 text-sm font-bold text-ink">{money(item.total)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-ink/10 bg-paper-2 px-5 py-4">
            <div className="flex items-center justify-between text-xs text-ink-soft/60">
              <span>مجموع البنود</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <strong className="text-lg">الإجمالي</strong>
              <strong className="text-2xl text-copper-deep">{money(bill.total)}</strong>
            </div>
          </div>
        </Card>

        <Card className="h-fit p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-copper/10 text-copper"><WalletCards size={17} /></span>
            <div>
              <h2 className="text-sm font-bold">طريقة الدفع</h2>
              <p className="text-[11px] text-ink-soft/50">اختر الطريقة قبل التأكيد</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {PAYMENT_METHODS.map((item) => (
              <label
                key={item.value}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition ${method === item.value ? "border-copper bg-copper/5" : "border-ink/10 hover:bg-ink/[0.025]"} ${paid ? "pointer-events-none opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={item.value}
                  checked={method === item.value}
                  onChange={(event) => setMethod(event.target.value)}
                  disabled={paid || submitting}
                  className="accent-copper"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-5 text-ink-soft/50">{item.description}</span>
                </span>
              </label>
            ))}
          </div>

          <Button
            onClick={handleConfirmPayment}
            disabled={paid || submitting}
            className="mt-4 w-full justify-center"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> جارِ تأكيد الدفع…</span>
            ) : paid ? (
              "تم الدفع وإغلاق الجلسة"
            ) : (
              <span className="flex items-center justify-center gap-2"><CreditCard size={16} /> تأكيد الدفع وإغلاق الجلسة</span>
            )}
          </Button>

          <button
            onClick={() => navigate("/cashier/tables")}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-ink-soft transition hover:bg-ink/[0.04]"
          >
            <ArrowRight size={15} /> العودة للطاولات
          </button>
        </Card>
      </div>
    </div>
  );
}
