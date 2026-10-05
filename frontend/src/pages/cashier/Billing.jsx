import { useEffect, useRef, useState } from "react";
import { money } from "../../utils/format";
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
import Modal from "../../components/ui/Modal";
import CloseSessionButton from "../../components/billing/CloseSessionButton";
import { usePermissions } from "../../hooks/usePermissions";
import { SYNCED, queuedRefs, useOutbox } from "../../offline/outbox";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import {
  adjustBillItem,
  getBill,
  recordPayment,
  verifyPayment,
  rejectPayment,
} from "../../api/billing";
import { t, dir } from "../../i18n";
import ItemOptions from "../../components/orders/ItemOptions";
import { withOptions } from "../../components/menu/cartLine";

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";


function mapBill(data, sessionId) {
  const session = data?.session || {};
  const items = (data?.items || []).map((item) => ({
    id: String(item.id),
    name: item.name,
    code: item.order_number ? t("طلب #{0}", { 0: item.order_number }) : `#${item.order_id}`,
    category: item.category || "—",
    quantity: Number(item.quantity),
    price: Number(item.unit_price),
    total: Number(item.total),
    note: item.note,
    options: item.options || [],
  }));
  const payments = data?.payments || [];
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const lastSettled = payments.filter((p) => p.status !== "pending").slice(-1)[0];

  return {
    id: String(session.id ?? sessionId),
    invoiceNumber: `INV-${session.id ?? sessionId}`,
    table: session.table_label ? t("طاولة {0}", { 0: session.table_label }) : "—",
    customer: session.customer_name || t("زبون"),
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
    // Lifecycle from the API (SessionLifecycle): drives the close button.
    lifecycle: data?.lifecycle,
    canClose: Boolean(data?.can_close),
    closeBlocker: data?.close_blocker || null,
    tableLabel: session.table_label,
    real: true,
  };
}

const MOCK_BILL = {
  id: "101",
  invoiceNumber: "INV-1001",
  table: t("طاولة 01"),
  customer: t("أحمد محمد"),
  date: "2026-09-09",
  sessionStatus: "bill_requested",
  closed: false,
  items: [
    { id: "1", code: "FOOD-001", name: t("برغر كلاسيك"), quantity: 2, price: 18, total: 36, category: t("وجبات") },
    { id: "2", code: "FOOD-014", name: t("بطاطا مقلية"), quantity: 1, price: 8, total: 8, category: t("إضافات") },
    { id: "3", code: "DRK-003", name: t("مشروب غازي"), quantity: 2, price: 5, total: 10, category: t("مشروبات") },
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
  const headers = [t("رقم الفاتورة"), t("التاريخ"), t("الطاولة"), t("الصنف"), t("كود الصنف"), t("التصنيف"), t("الكمية"), t("سعر الوحدة"), t("الإجمالي")];
  const rows = bill.items.map((item) => [
    bill.invoiceNumber, bill.date, bill.table,
    withOptions(item), item.code, item.category,
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

const METHOD_LABELS = { cash: t("نقدًا"), electronic: t("إلكتروني"), ussd: "USSD" };
const PAYMENT_METHODS = [
  { value: "cash", label: t("نقدًا"), description: t("الدفع المباشر عند الكاشير") },
  { value: "electronic", label: t("إلكتروني"), description: t("بطاقة أو وسيلة إلكترونية") },
  { value: "ussd", label: "USSD", description: t("قناة دفع بديلة أوفلاين") },
];

export default function Billing() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();
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
      .catch((err) => setNotice({ type: "error", text: err.message || t("تعذر تحميل الفاتورة.") }))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { loadBill(); }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps
  // A payment saved offline was just sent: show the bill as the server has it now.
  useEffect(() => {
    const refresh = () => loadBill(true);
    window.addEventListener(SYNCED, refresh);
    return () => window.removeEventListener(SYNCED, refresh);
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleVerify(paymentId) {
    setVerifying(paymentId);
    try {
      await verifyPayment(paymentId);
      setNotice({ type: "success", text: t("تم قبول دفعة العميل بنجاح.") });
      loadBill(true);
    } catch (err) {
      setNotice({ type: "error", text: err.message || t("تعذر قبول الدفعة.") });
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
      setNotice({ type: "success", text: t("تم رفض دفعة العميل.") });
      loadBill(true);
    } catch (err) {
      setNotice({ type: "error", text: err.message || t("تعذر رفض الدفعة.") });
    } finally {
      setVerifying(null);
    }
  }

  // US-18: price adjustment in a dialog (validated, with reason) instead of window.prompt.
  const [adjusting, setAdjusting] = useState(null);
  function handleAdjust(item) {
    setAdjusting({ item, price: String(item.price), reason: "", error: "", saving: false });
  }
  async function submitAdjust(event) {
    event.preventDefault();
    const newPrice = Number(adjusting.price);
    if (adjusting.price === "" || !Number.isFinite(newPrice) || newPrice < 0) {
      setAdjusting((a) => ({ ...a, error: t("أدخل سعرًا صحيحًا يساوي صفرًا أو أكثر.") }));
      return;
    }
    setAdjusting((a) => ({ ...a, saving: true, error: "" }));
    try {
      const data = await adjustBillItem(sessionId, adjusting.item.id, { new_price: newPrice, reason: adjusting.reason.trim() || undefined });
      setBill(mapBill(data, sessionId));
      setAdjusting(null);
      setNotice({ type: "success", text: t("تم تعديل السعر وتسجيله في سجل التدقيق.") });
    } catch (err) {
      setAdjusting((a) => ({ ...a, saving: false, error: err.message || t("تعذّر تعديل السعر.") }));
    }
  }

  async function handleConfirmPayment() {
    setSubmitting(true);
    setNotice(null);

    if (USE_MOCKS) {
      await new Promise((r) => setTimeout(r, 600));
      setBill((prev) => ({ ...prev, closed: true, paymentMethod: method }));
      setNotice({ type: "success", text: t("تم تسجيل الدفع (بيانات وهمية).") });
      setSubmitting(false);
      return;
    }

    try {
      const payment = await recordPayment(sessionId, method);
      if (payment?.queued) {
        // No connection: saved on this device, sent when it returns (offline/outbox.js).
        setNotice({ type: "success", text: t("لا يوجد اتصال: حُفظ الدفع على هذا الجهاز وسيُرسل تلقائيًا عند عودة الإنترنت.") });
        return;
      }
      setNotice({
        type: "success",
        text: payment?.status === "pending_reconciliation"
          ? t("تم تسجيل دفعة USSD وإغلاق الجلسة — بانتظار التسوية.")
          : t("تم تسجيل الدفع وإغلاق الجلسة. الطاولة متاحة الآن."),
      });
      loadBill(true);
    } catch (err) {
      setNotice({ type: "error", text: err.message || t("تعذر تسجيل الدفع.") });
    } finally {
      setSubmitting(false);
    }
  }

  const outbox = useOutbox();
  if (loading) return <Spinner label={t("جارِ تحميل الفاتورة…")} />;
  if (!bill) return null;

  const isPaid = bill.closed || bill.outstanding <= 0;
  // A payment saved offline is not on the server yet: never offer to take it twice.
  const queuedPayment = queuedRefs(outbox, "payment").has(String(sessionId));
  const hasPending = bill.pendingPayments?.length > 0;

  return (
    <div dir={dir} className="mx-auto max-w-4xl pb-10">
      <PageHeader
        title={t("مركز الفاتورة")}
        subtitle={t("{0} · {1} · جلسة #{2}", { 0: bill.invoiceNumber, 1: bill.table, 2: sessionId })}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loadBill(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-ink/10 px-3.5 py-2 text-sm font-bold hover:bg-ink/[0.04] disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> {t("تحديث")}
            </button>
            <button
              onClick={() => downloadExcelCompatible(bill)}
              className="flex items-center gap-2 rounded-xl bg-herb px-3.5 py-2 text-sm font-bold text-paper"
            >
              <Download size={15} /> {t("تصدير Excel")}
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
                <p className="font-bold text-copper-ink">{t("دفعة معلّقة من العميل — يتطلب إجراء")}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {p.payer_name && <span className="ml-2">{p.payer_name}</span>}
                  {p.method && <span className="ml-2">· {METHOD_LABELS[p.method] || p.method}</span>}
                  {p.amount > 0 && <span>· {money(p.amount)}</span>}
                </p>
              </div>
            </div>
            {can("verify_payments") && <div className="flex gap-2">
              <button
                onClick={() => handleVerify(p.id)}
                disabled={!!verifying}
                className="flex items-center gap-1.5 rounded-xl bg-herb px-4 py-2 text-sm font-bold text-paper disabled:opacity-60"
              >
                {verifying === p.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                {t("قبول")}
              </button>
              <button
                onClick={() => { setRejectModal({ paymentId: p.id }); setRejectReason(""); }}
                disabled={!!verifying}
                className="flex items-center gap-1.5 rounded-xl border border-brick/30 bg-brick/10 px-4 py-2 text-sm font-bold text-brick disabled:opacity-60"
              >
                <X size={15} /> {t("رفض")}
              </button>
            </div>}
          </div>
        </div>
      ))}

      {/* ── Summary cards ──────────────────────────────────────────────── */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          [t("الطاولة"), bill.table],
          [t("العميل"), bill.customer],
          [t("الحالة"), isPaid ? t("مدفوعة ✓") : t("مفتوحة")],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className={`mt-1 font-bold ${label === t("الحالة") && isPaid ? "text-herb" : ""}`}>{value}</p>
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
              <h2 className="text-sm font-bold">{t("بنود الفاتورة")}</h2>
              <p className="text-xs text-muted">{bill.items.length} {t("صنف —")} {bill.real ? t("بيانات حقيقية") : t("بيانات وهمية")}</p>
            </div>
          </div>
          {!bill.real && (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-ink/10 px-3 py-2 text-xs font-bold hover:bg-ink/[0.03]">
              <Upload size={14} /> {t("استيراد CSV")}
              <input ref={importRef} type="file" accept=".csv,.txt" className="hidden" />
            </label>
          )}
        </div>

        {bill.items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted">{t("لا توجد أصناف في هذه الجلسة بعد.")}</div>
        ) : (
          <div className="divide-y divide-ink/[0.06]">
            {bill.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-ink/[0.015]">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.name}</p>
                  <ItemOptions options={item.options} />
                  <p className="mt-0.5 text-xs text-muted">
                    {item.code} · {item.category} · {money(item.price)} {t("للوحدة")}
                  </p>
                  {item.note && <p className="mt-0.5 text-xs text-copper">{item.note}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-xl border border-ink/10 px-3 py-1.5 text-sm font-bold">×{item.quantity}</span>
                  {bill.real && !isPaid && can("adjust_bill") && (
                    <button
                      onClick={() => handleAdjust(item)}
                      className="rounded-lg px-2 py-1 text-xs font-bold text-copper hover:bg-copper/10"
                    >
                      {t("تعديل")}
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
          <div className="flex justify-between text-sm text-muted"><span>{t("المجموع الفرعي")}</span><span>{money(bill.subtotal)}</span></div>
          {bill.real && bill.paidAmount > 0 && (
            <div className="flex justify-between text-sm text-herb"><span>{t("مدفوع مسبقًا")}</span><span>{money(bill.paidAmount)}</span></div>
          )}
          <div className="flex justify-between border-t border-ink/10 pt-3">
            <strong className="text-base">{t("الإجمالي المستحق")}</strong>
            <strong className={`text-2xl ${isPaid ? "text-herb" : "text-copper-ink"}`}>{money(bill.outstanding)}</strong>
          </div>
          {bill.paymentStatus === "pending_reconciliation" && (
            <p className="rounded-lg bg-copper/10 px-3 py-2 text-xs font-bold text-copper-ink">
              {t("دفعة USSD بانتظار التسوية")}
            </p>
          )}
        </div>
      </Card>

      {/* ── Payment section ────────────────────────────────────────────── */}
      {queuedPayment ? (
        <Card className="flex items-center gap-3 p-5 text-herb">
          <CheckCircle2 size={22} aria-hidden="true" />
          <div>
            <p className="font-bold">{t("حُفظ الدفع على هذا الجهاز")}</p>
            <p className="mt-0.5 text-xs text-muted">{t("سيُرسل تلقائيًا عند عودة الإنترنت، وتُغلق الجلسة معه.")}</p>
          </div>
        </Card>
      ) : !isPaid && !can("record_payment") ? (
        <Card className="p-5 text-sm text-muted">{t("تسجيل الدفع يحتاج صلاحية «تسجيل الدفع». اطلبها من صاحب المطعم إذا كانت ضمن عملك.")}</Card>
      ) : !isPaid ? (
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold">{t("تسجيل الدفع")}</h2>
          {hasPending && (
            <p className="mb-4 rounded-xl border border-copper/25 bg-copper/5 px-4 py-2.5 text-xs font-semibold text-copper-ink">
              {t("يجب قبول أو رفض دفعة العميل أعلاه قبل تسجيل دفع جديد.")}
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
                  <span className="block text-xs text-muted">{item.description}</span>
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
              ? <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> {t("جارِ تسجيل الدفع…")}</span>
              : <span className="flex items-center gap-2"><CreditCard size={16} /> {t("تأكيد الدفع ·")} {money(bill.outstanding)}</span>}
          </Button>
        </Card>
      ) : (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3 text-herb">
            <CheckCircle2 size={22} aria-hidden="true" />
            <div>
              <p className="font-bold">{bill.closed ? t("دُفعت الفاتورة وأُغلقت الجلسة") : t("الفاتورة مدفوعة بالكامل")}</p>
              {bill.paymentMethod && <p className="text-xs opacity-80">{t("طريقة الدفع:")} {METHOD_LABELS[bill.paymentMethod] || bill.paymentMethod}</p>}
              {!bill.closed && <p className="mt-0.5 text-xs text-muted">{t("أغلق الجلسة لتصبح الطاولة متاحة للزبون التالي.")}</p>}
            </div>
          </div>
          {bill.real && !bill.closed && (
            <CloseSessionButton
              session={{ id: sessionId, tableLabel: bill.tableLabel, billTotal: bill.total, paidTotal: bill.paidAmount, outstanding: bill.outstanding, canClose: bill.canClose, closeBlocker: bill.closeBlocker }}
              onClosed={() => navigate("/cashier/tables")}
            />
          )}
        </Card>
      )}

      <button
        onClick={() => navigate("/cashier/tables")}
        className="mt-4 flex items-center gap-2 text-sm font-bold text-ink-soft hover:text-ink"
      >
        <ArrowRight size={15} /> {t("العودة للطاولات")}
      </button>

      {/* ── Reject Modal ───────────────────────────────────────────────── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setRejectModal(null)}>
          <div dir={dir} className="w-full max-w-sm rounded-2xl bg-paper p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-base font-black">{t("رفض دفعة العميل")}</h3>
            <p className="mb-4 text-xs text-muted">{t("سيُرفض الطلب ويُعلَم العميل. أدخل سبب الرفض.")}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t("سبب الرفض…")}
              rows={3}
              className="w-full rounded-xl border border-ink/15 bg-paper-2 p-3 text-sm outline-none focus:border-copper"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="flex-1 rounded-xl bg-brick py-2.5 text-sm font-bold text-paper disabled:opacity-50"
              >
                {t("رفض الدفعة")}
              </button>
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 rounded-xl border border-ink/10 py-2.5 text-sm font-bold"
              >
                {t("إلغاء")}
              </button>
            </div>
          </div>
        </div>
      )}
      <Modal
        open={Boolean(adjusting)}
        onClose={() => !adjusting?.saving && setAdjusting(null)}
        size="sm"
        title={adjusting ? t("تعديل سعر «{0}»", { 0: adjusting.item.name }) : ""}
        description={t("يُحفظ السعر القديم والجديد واسم الكاشير في سجل التدقيق.")}
      >
        {adjusting && (
          <form id="adjust-form" onSubmit={submitAdjust} className="space-y-4">
            <Input label={t("السعر الجديد للوحدة (₪)")} type="number" inputMode="decimal" min="0" step="0.01" required value={adjusting.price}
              onChange={(e) => setAdjusting((a) => ({ ...a, price: e.target.value, error: "" }))} error={adjusting.error}
              hint={t("السعر الحالي {0} ₪ × {1}", { 0: adjusting.item.price, 1: adjusting.item.quantity })} autoFocus />
            <Input label={t("سبب التعديل")} placeholder={t("مثل: خصم ولاء، طبق بديل")} maxLength={255} value={adjusting.reason}
              onChange={(e) => setAdjusting((a) => ({ ...a, reason: e.target.value }))} hint={t("اختياري، لكنه يساعد عند مراجعة الحسابات.")} />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setAdjusting(null)} disabled={adjusting.saving}>{t("تراجع")}</Button>
              <Button type="submit" loading={adjusting.saving}>{t("حفظ السعر")}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
