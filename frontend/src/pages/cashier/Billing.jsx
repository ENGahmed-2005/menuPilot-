import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Download,
  Loader2,
  Receipt,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import {
  adjustBillItem,
  getBill,
  recordPayment,
  verifyPayment,
  rejectPayment,
} from "../../api/billing";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

const money = (v) =>
  `${Number(v || 0).toLocaleString("ar-PS", { maximumFractionDigits: 2 })} ₪`;

function mapBill(data, sessionId) {
  const session = data?.session || {};
  const items = (data?.items || []).map((item) => ({
    id: String(item.id),
    name: item.name,
    code: item.order_number ? `طلب #${item.order_number}` : `#${item.order_id}`,
    category: item.category || "—",
    quantity: Number(item.quantity),
    price: Number(item.unit_price),
    total: Number(item.total),
    note: item.note,
  }));
  const payments = data?.payments || [];
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const lastSettled = payments.filter((p) => p.status !== "pending").slice(-1)[0];

  return {
    id: String(session.id ?? sessionId),
    invoiceNumber: `INV-${session.id ?? sessionId}`,
    table: session.table_label ? `طاولة ${session.table_label}` : "—",
    customer: session.customer_name || "زبون",
    date: (session.opened_at || "").slice(0, 10),
    sessionStatus: session.status,
    closed: !!session.closed_at,
    items,
    subtotal: Number(data?.total || 0),
    total: Number(data?.total || 0),
    paidAmount: Number(data?.paid || 0),
    outstanding: Number(data?.outstanding || 0),
    paymentMethod: lastSettled?.method || "",
    paymentStatus: lastSettled?.status || "",
    pendingPayments,
    real: true,
  };
}

const MOCK_BILL = {
  id: "101",
  invoiceNumber: "INV-1001",
  table: "طاولة 01",
  customer: "أحمد محمد",
  date: "2026-09-09",
  sessionStatus: "bill_requested",
  closed: false,
  items: [
    { id: "1", code: "FOOD-001", name: "برغر كلاسيك", quantity: 2, price: 18, total: 36, category: "وجبات" },
    { id: "2", code: "FOOD-014", name: "بطاطا مقلية", quantity: 1, price: 8, total: 8, category: "إضافات" },
    { id: "3", code: "DRK-003", name: "مشروب غازي", quantity: 2, price: 5, total: 10, category: "مشروبات" },
  ],
  subtotal: 54,
  total: 54,
  paidAmount: 0,
  outstanding: 54,
  paymentMethod: "",
  paymentStatus: "",
  pendingPayments: [],
  real: false,
};

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadExcelCompatible(bill) {
  const headers = ["رقم الفاتورة", "التاريخ", "الطاولة", "الصنف", "كود الصنف", "التصنيف", "الكمية", "سعر الوحدة", "الإجمالي"];
  const rows = bill.items.map((item) => [
    bill.invoiceNumber, bill.date, bill.table,
    item.name, item.code, item.category,
    item.quantity, item.price, item.total,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${bill.invoiceNumber || "invoice"}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

const METHOD_LABELS = { cash: "نقدًا", electronic: "إلكتروني", ussd: "USSD" };
const PAYMENT_METHODS = [
  { value: "cash", label: "نقدًا", description: "الدفع المباشر عند الكاشير" },
  { value: "electronic", label: "إلكتروني", description: "بطاقة أو وسيلة إلكترونية" },
  { value: "ussd", label: "USSD", description: "قناة دفع بديلة أوفلاين" },
];

export default function Billing() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const importRef = useRef(null);

  const [bill, setBill] = useState(null);
  const [method, setMethod] = useState("cash");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(null); // paymentId being processed
  const [notice, setNotice] = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // { paymentId }
  const [rejectReason, setRejectReason] = useState("");

  function loadBill(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);

    if (USE_MOCKS) {
      setTimeout(() => { setBill(MOCK_BILL); setLoading(false); setRefreshing(false); }, 300);
      return;
    }

    getBill(sessionId)
      .then((data) => { setBill(mapBill(data, sessionId)); setNotice(null); })
      .catch((err) => setNotice({ type: "error", text: err.message || "تعذر تحميل الفاتورة." }))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { loadBill(); }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVerify(paymentId) {
    setVerifying(paymentId);
    try {
      await verifyPayment(paymentId);
      setNotice({ type: "success", text: "تم قبول دفعة العميل بنجاح." });
      loadBill(true);
    } catch (err) {
      setNotice({ type: "error", text: err.message || "تعذر قبول الدفعة." });
    } finally {
      setVerifying(null);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    const { paymentId } = rejectModal;
    setVerifying(paymentId);
    setRejectModal(null);
    try {
      await rejectPayment(paymentId, rejectReason.trim());
      setRejectReason("");
      setNotice({ type: "success", text: "تم رفض دفعة العميل." });
      loadBill(true);
    } catch (err) {
      setNotice({ type: "error", text: err.message || "تعذر رفض الدفعة." });
    } finally {
      setVerifying(null);
    }
  }

  async function handleAdjust(item) {
    const value = window.prompt(`السعر الجديد للوحدة لـ "${item.name}"`, String(item.price));
    if (value === null) return;
    const newPrice = Number(value);
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      setNotice({ type: "error", text: "أدخل سعرًا صحيحًا." });
      return;
    }
    const reason = window.prompt("سبب التعديل (اختياري)", "") || undefined;
    try {
      const data = await adjustBillItem(sessionId, item.id, { new_price: newPrice, reason });
      setBill(mapBill(data, sessionId));
      setNotice({ type: "success", text: "تم تعديل السعر." });
    } catch (err) {
      setNotice({ type: "error", text: err.message || "تعذر تعديل السعر." });
    }
  }

  async function handleConfirmPayment() {
    setSubmitting(true);
    setNotice(null);

    if (USE_MOCKS) {
      await new Promise((r) => setTimeout(r, 600));
      setBill((prev) => ({ ...prev, closed: true, paymentMethod: method }));
      setNotice({ type: "success", text: "تم تسجيل الدفع (بيانات وهمية)." });
      setSubmitting(false);
      return;
    }

    try {
      const payment = await recordPayment(sessionId, method);
      setNotice({
        type: "success",
        text: payment?.status === "pending_reconciliation"
          ? "تم تسجيل دفعة USSD وإغلاق الجلسة — بانتظار التسوية."
          : "تم تسجيل الدفع وإغلاق الجلسة. الطاولة متاحة الآن.",
      });
      loadBill(true);
    } catch (err) {
      setNotice({ type: "error", text: err.message || "تعذر تسجيل الدفع." });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner label="جارِ تحميل الفاتورة…" />;
  if (!bill) return null;

  const isPaid = bill.closed || bill.outstanding <= 0;
  const hasPending = bill.pendingPayments?.length > 0;

  return (
    <div dir="rtl" className="mx-auto max-w-4xl pb-10">
      <PageHeader
        title="مركز الفاتورة"
        subtitle={`${bill.invoiceNumber} · ${bill.table} · جلسة #${sessionId}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loadBill(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-ink/10 px-3.5 py-2 text-sm font-bold hover:bg-ink/[0.04] disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> تحديث
            </button>
            <button
              onClick={() => downloadExcelCompatible(bill)}
              className="flex items-center gap-2 rounded-xl bg-herb px-3.5 py-2 text-sm font-bold text-paper"
            >
              <Download size={15} /> تصدير Excel
            </button>
          </div>
        }
      />

      {/* Notices */}
      {notice && (
        <div className={`mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${notice.type === "success" ? "border-herb/20 bg-herb/10 text-herb" : "border-brick/20 bg-brick/10 text-brick"}`}>
          {notice.type === "success" ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <AlertTriangle size={17} className="mt-0.5 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* ── Pending customer payment ───────────────────────────────────── */}
      {hasPending && bill.pendingPayments.map((p) => (
        <div key={p.id} className="mb-5 rounded-2xl border-2 border-copper/40 bg-copper/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-copper/15 text-copper">
                <AlertTriangle size={18} />
              </span>
              <div>
                <p className="font-bold text-copper-deep">دفعة معلّقة من العميل — يتطلب إجراء</p>
                <p className="mt-0.5 text-xs text-ink-soft/70">
                  {p.payer_name && <span className="ml-2">{p.payer_name}</span>}
                  {p.method && <span className="ml-2">· {METHOD_LABELS[p.method] || p.method}</span>}
                  {p.amount > 0 && <span>· {money(p.amount)}</span>}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleVerify(p.id)}
                disabled={!!verifying}
                className="flex items-center gap-1.5 rounded-xl bg-herb px-4 py-2 text-sm font-bold text-paper disabled:opacity-60"
              >
                {verifying === p.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                قبول
              </button>
              <button
                onClick={() => { setRejectModal({ paymentId: p.id }); setRejectReason(""); }}
                disabled={!!verifying}
                className="flex items-center gap-1.5 rounded-xl border border-brick/30 bg-brick/10 px-4 py-2 text-sm font-bold text-brick disabled:opacity-60"
              >
                <X size={15} /> رفض
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* ── Summary cards ──────────────────────────────────────────────── */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ["الطاولة", bill.table],
          ["العميل", bill.customer],
          ["الحالة", isPaid ? "مدفوعة ✓" : "مفتوحة"],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-[11px] text-ink-soft/50">{label}</p>
            <p className={`mt-1 font-bold ${label === "الحالة" && isPaid ? "text-herb" : ""}`}>{value}</p>
          </Card>
        ))}
      </div>

      {/* ── Bill items ─────────────────────────────────────────────────── */}
      <Card className="mb-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink/10 bg-ink/[0.025] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-copper/10 text-copper">
              <Receipt size={17} />
            </span>
            <div>
              <h2 className="text-sm font-bold">بنود الفاتورة</h2>
              <p className="text-[11px] text-ink-soft/50">{bill.items.length} صنف — {bill.real ? "بيانات حقيقية" : "بيانات وهمية"}</p>
            </div>
          </div>
          {!bill.real && (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-ink/10 px-3 py-2 text-xs font-bold hover:bg-ink/[0.03]">
              <Upload size={14} /> استيراد CSV
              <input ref={importRef} type="file" accept=".csv,.txt" className="hidden" />
            </label>
          )}
        </div>

        {bill.items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-ink-soft/50">لا توجد أصناف في هذه الجلسة بعد.</div>
        ) : (
          <div className="divide-y divide-ink/[0.06]">
            {bill.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-ink/[0.015]">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.name}</p>
                  <p className="mt-0.5 text-[11px] text-ink-soft/50">
                    {item.code} · {item.category} · {money(item.price)} للوحدة
                  </p>
                  {item.note && <p className="mt-0.5 text-[11px] text-copper">{item.note}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-xl border border-ink/10 px-3 py-1.5 text-sm font-bold">×{item.quantity}</span>
                  {bill.real && !isPaid && (
                    <button
                      onClick={() => handleAdjust(item)}
                      className="rounded-lg px-2 py-1 text-[11px] font-bold text-copper hover:bg-copper/10"
                    >
                      تعديل
                    </button>
                  )}
                  <span className="w-20 text-left text-sm font-bold">{money(item.total)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-ink/10 bg-paper-2 px-5 py-5 space-y-2">
          <div className="flex justify-between text-sm text-ink-soft/60"><span>المجموع الفرعي</span><span>{money(bill.subtotal)}</span></div>
          {bill.real && bill.paidAmount > 0 && (
            <div className="flex justify-between text-sm text-herb"><span>مدفوع مسبقًا</span><span>{money(bill.paidAmount)}</span></div>
          )}
          <div className="flex justify-between border-t border-ink/10 pt-3">
            <strong className="text-base">الإجمالي المستحق</strong>
            <strong className={`text-2xl ${isPaid ? "text-herb" : "text-copper-deep"}`}>{money(bill.outstanding)}</strong>
          </div>
          {bill.paymentStatus === "pending_reconciliation" && (
            <p className="rounded-lg bg-copper/10 px-3 py-2 text-[11px] font-bold text-copper-deep">
              دفعة USSD بانتظار التسوية
            </p>
          )}
        </div>
      </Card>

      {/* ── Payment section ────────────────────────────────────────────── */}
      {!isPaid ? (
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold">تسجيل الدفع</h2>
          {hasPending && (
            <p className="mb-4 rounded-xl border border-copper/25 bg-copper/5 px-4 py-2.5 text-xs font-semibold text-copper-deep">
              يجب قبول أو رفض دفعة العميل أعلاه قبل تسجيل دفع جديد.
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            {PAYMENT_METHODS.map((item) => (
              <label
                key={item.value}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-colors ${method === item.value ? "border-copper bg-copper/5" : "border-ink/10 hover:bg-ink/[0.025]"} ${hasPending ? "pointer-events-none opacity-50" : ""}`}
              >
                <input
                  type="radio"
                  name="payment-method"
                  value={item.value}
                  checked={method === item.value}
                  onChange={(e) => setMethod(e.target.value)}
                  disabled={hasPending || submitting}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className="block text-[11px] text-ink-soft/50">{item.description}</span>
                </span>
              </label>
            ))}
          </div>
          <Button
            onClick={handleConfirmPayment}
            disabled={hasPending || submitting}
            className="mt-4 w-full justify-center"
          >
            {submitting
              ? <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> جارِ تسجيل الدفع…</span>
              : <span className="flex items-center gap-2"><CreditCard size={16} /> تأكيد الدفع · {money(bill.outstanding)}</span>}
          </Button>
        </Card>
      ) : (
        <Card className="flex items-center justify-center gap-3 p-6 text-herb">
          <CheckCircle2 size={22} />
          <div>
            <p className="font-bold">تم تسجيل الدفع وإغلاق الجلسة</p>
            {bill.paymentMethod && <p className="text-xs opacity-70">طريقة الدفع: {METHOD_LABELS[bill.paymentMethod] || bill.paymentMethod}</p>}
          </div>
        </Card>
      )}

      <button
        onClick={() => navigate("/cashier/tables")}
        className="mt-4 flex items-center gap-2 text-sm font-bold text-ink-soft hover:text-ink"
      >
        <ArrowRight size={15} /> العودة للطاولات
      </button>

      {/* ── Reject Modal ───────────────────────────────────────────────── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setRejectModal(null)}>
          <div dir="rtl" className="w-full max-w-sm rounded-2xl bg-paper p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-base font-black">رفض دفعة العميل</h3>
            <p className="mb-4 text-xs text-ink-soft/60">سيُرفض الطلب ويُعلَم العميل. أدخل سبب الرفض.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="سبب الرفض…"
              rows={3}
              className="w-full rounded-xl border border-ink/15 bg-paper-2 p-3 text-sm outline-none focus:border-copper"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="flex-1 rounded-xl bg-brick py-2.5 text-sm font-bold text-paper disabled:opacity-50"
              >
                رفض الدفعة
              </button>
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 rounded-xl border border-ink/10 py-2.5 text-sm font-bold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
