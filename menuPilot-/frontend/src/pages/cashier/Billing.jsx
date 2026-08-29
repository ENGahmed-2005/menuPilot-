/* ==========================================================================
   Billing.jsx — مراجعة الفاتورة وتسجيل الدفع وإغلاق الجلسة
   يغطي: FR-29 (تجميع الفاتورة), FR-30 (طريقة الدفع), FR-31 (إغلاق الجلسة),
         FR-36 (تعديل يدوي على بند), FR-37 (دفع أوفلاين عبر USSD)
   ========================================================================== */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, CreditCard, Receipt } from "lucide-react";
import { getBill, recordPayment } from "../../api/billing";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";

const PAYMENT_METHODS = [
  { value: "cash", label: "نقدًا" },
  { value: "electronic", label: "إلكتروني" },
  { value: "ussd", label: "USSD (دون اتصال)" }, // FR-37
];

export default function Billing() {
  const { sessionId } = useParams();
  const [bill, setBill] = useState(null);
  const [method, setMethod] = useState("cash");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getBill(sessionId)
      .then(setBill)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [sessionId]);

  async function handleConfirmPayment() {
    setSubmitting(true);
    setError(null);
    try {
      await recordPayment(sessionId, method); // FR-31: يغلق الجلسة في الـ backend
      setBill((prev) => ({ ...prev, status: "Paid" }));
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner label="جارِ تحميل الفاتورة…" />;
  if (error)
    return (
      <p role="alert" className="rounded-lg bg-brick/10 px-3 py-2 text-sm text-brick">
        {error.message}
      </p>
    );
  if (!bill) return null;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title={`الفاتورة`}
        subtitle={`جلسة #${sessionId}`}
      />

      <Card className="mb-5 divide-y divide-ink/10 overflow-hidden">
        <div className="flex items-center gap-2 bg-ink/[0.03] px-4 py-2.5 text-xs font-medium text-ink-soft">
          <Receipt size={14} aria-hidden="true" />
          بنود الفاتورة
        </div>
        {bill.items.map((item) => (
          <div key={item.id} className="flex justify-between px-4 py-3 text-sm">
            <span className="text-ink">
              {item.name} <span className="text-ink-soft">× {item.quantity}</span>
              {/* TODO (FR-36): manual adjustment UI — original vs adjusted value,
                  cashier identity and timestamp are recorded server-side via
                  adjustBillItem() in api/billing.js */}
            </span>
            <span className="font-medium text-ink">{item.total}</span>
          </div>
        ))}
      </Card>

      <Card className="mb-6 flex items-center justify-between px-5 py-4">
        <strong className="font-display text-2xl text-ink">الإجمالي</strong>
        <strong className="font-display text-2xl text-ink">{bill.total}</strong>
      </Card>

      {bill.status === "Paid" ? (
        <Card className="flex items-center gap-2.5 border-herb/30 bg-herb/10 px-4 py-3 text-sm font-medium text-herb">
          <CheckCircle2 size={18} aria-hidden="true" />
          تم الدفع — الطاولة متاحة الآن.
        </Card>
      ) : (
        <Card className="flex flex-wrap items-center gap-3 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-ink-soft">
            <CreditCard size={16} aria-hidden="true" />
            طريقة الدفع
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="rounded-lg border border-ink/15 px-3 py-2.5 text-sm text-ink outline-none focus:border-copper focus:ring-2 focus:ring-copper/20"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <Button onClick={handleConfirmPayment} disabled={submitting} className="mr-auto">
            {submitting ? "جارِ التأكيد…" : "تأكيد الدفع وإغلاق الجلسة"}
          </Button>
        </Card>
      )}
    </div>
  );
}
