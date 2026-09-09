import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  Loader2,
  Receipt,
  RefreshCw,
  Upload,
  WalletCards,
} from "lucide-react";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";

const PAYMENT_METHODS = [
  { value: "cash", label: "نقدًا", description: "الدفع المباشر عند الكاشير" },
  { value: "electronic", label: "إلكتروني", description: "بطاقة أو وسيلة دفع إلكترونية" },
  { value: "ussd", label: "USSD", description: "قناة دفع بديلة" },
];

const MOCK_BILLS = {
  "101": {
    id: "101",
    invoiceNumber: "INV-1001",
    table: "طاولة 01",
    customer: "أحمد محمد",
    date: "2026-09-09",
    status: "Open",
    tax: 4.5,
    discount: 0,
    items: [
      { id: "1", code: "FOOD-001", name: "برغر كلاسيك", quantity: 2, price: 18, total: 36, category: "وجبات" },
      { id: "2", code: "FOOD-014", name: "بطاطا مقلية", quantity: 1, price: 8, total: 8, category: "إضافات" },
      { id: "3", code: "DRK-003", name: "مشروب غازي", quantity: 2, price: 5, total: 10, category: "مشروبات" },
    ],
  },
  "102": {
    id: "102",
    invoiceNumber: "INV-1002",
    table: "طاولة 02",
    customer: "سارة علي",
    date: "2026-09-09",
    status: "Open",
    tax: 3.2,
    discount: 2,
    items: [
      { id: "4", code: "FOOD-007", name: "بيتزا خضار", quantity: 1, price: 24, total: 24, category: "بيتزا" },
      { id: "5", code: "DRK-005", name: "عصير برتقال", quantity: 2, price: 6, total: 12, category: "مشروبات" },
    ],
  },
};

const money = (value) => `${Number(value || 0).toLocaleString("ar-PS", { maximumFractionDigits: 2 })} ₪`;

function getMockBill(sessionId) {
  const source = MOCK_BILLS[sessionId] || MOCK_BILLS["101"];
  const items = source.items.map((item) => ({ ...item }));
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  return {
    ...source,
    items,
    subtotal,
    total: subtotal + Number(source.tax || 0) - Number(source.discount || 0),
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadExcelCompatible(bill) {
  const headers = ["رقم الفاتورة", "التاريخ", "الطاولة", "الصنف", "كود الصنف", "التصنيف", "الكمية", "سعر الوحدة", "الإجمالي", "الضريبة", "الخصم", "الإجمالي النهائي", "طريقة الدفع"];
  const rows = bill.items.map((item) => [
    bill.invoiceNumber,
    bill.date,
    bill.table,
    item.name,
    item.code,
    item.category,
    item.quantity,
    item.price,
    item.total,
    bill.tax,
    bill.discount,
    bill.total,
    bill.paymentMethod || "",
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${bill.invoiceNumber || "menupilot-invoice"}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  return lines.slice(1).map((line) => {
    const cells = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"' && line[index + 1] === '"' && quoted) {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

export default function Billing() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const importRef = useRef(null);
  const [bill, setBill] = useState(null);
  const [method, setMethod] = useState("cash");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  function loadBill(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    window.setTimeout(() => {
      setBill(getMockBill(sessionId));
      setLoading(false);
      setRefreshing(false);
    }, 350);
  }

  useEffect(() => {
    loadBill();
  }, [sessionId]);

  function handleImport(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCsv(String(reader.result || ""));
        if (!rows.length) throw new Error("الملف لا يحتوي على بيانات قابلة للاستيراد.");
        const items = rows.map((row, index) => ({
          id: `import-${index}`,
          name: row[3] || `صنف ${index + 1}`,
          code: row[4] || `IMPORT-${index + 1}`,
          category: row[5] || "مستورد",
          quantity: Number(row[6]) || 1,
          price: Number(row[7]) || 0,
          total: Number(row[8]) || (Number(row[6]) || 1) * (Number(row[7]) || 0),
        }));
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        setBill((previous) => ({
          ...previous,
          invoiceNumber: rows[0][0] || previous.invoiceNumber,
          date: rows[0][1] || previous.date,
          table: rows[0][2] || previous.table,
          items,
          subtotal,
          total: subtotal + Number(previous.tax || 0) - Number(previous.discount || 0),
        }));
        setNotice({ type: "success", text: `تم استيراد ${items.length} بند من جدول Excel.` });
      } catch (error) {
        setNotice({ type: "error", text: error.message || "تعذر قراءة الملف." });
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function changeQuantity(itemId, delta) {
    setBill((previous) => {
      const items = previous.items.map((item) => {
        if (item.id !== itemId) return item;
        const quantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity, total: quantity * item.price };
      });
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      return { ...previous, items, subtotal, total: subtotal + Number(previous.tax || 0) - Number(previous.discount || 0) };
    });
  }

  async function handleConfirmPayment() {
    setSubmitting(true);
    setNotice(null);
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    setBill((previous) => ({ ...previous, status: "Paid", paymentMethod: method }));
    setNotice({ type: "success", text: "تم تسجيل الدفع بنجاح — البيانات جاهزة للتصدير إلى Excel." });
    setSubmitting(false);
  }

  const subtotal = useMemo(() => (bill?.items || []).reduce((sum, item) => sum + Number(item.total || 0), 0), [bill]);
  const paid = bill?.status === "Paid";

  if (loading) return <Spinner label="جارِ تحميل الفاتورة التجريبية…" />;
  if (!bill) return null;

  return (
    <div dir="rtl" className="mx-auto max-w-4xl pb-8">
      <PageHeader
        title="مركز الفاتورة"
        subtitle={`${bill.invoiceNumber} · ${bill.table} · جلسة #${sessionId}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => loadBill(true)} disabled={refreshing} className="flex items-center gap-2 rounded-xl border border-ink/10 px-3.5 py-2 text-sm font-bold hover:bg-ink/[0.04] disabled:opacity-50">
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> تحديث
            </button>
            <button onClick={() => downloadExcelCompatible(bill)} className="flex items-center gap-2 rounded-xl bg-herb px-3.5 py-2 text-sm font-bold text-paper">
              <Download size={16} /> تصدير Excel
            </button>
          </div>
        }
      />

      {notice && (
        <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${notice.type === "success" ? "border-herb/15 bg-herb/10 text-herb" : "border-brick/15 bg-brick/10 text-brick"}`}>
          {notice.text}
        </div>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          ["الطاولة", bill.table],
          ["العميل", bill.customer],
          ["الحالة", paid ? "مدفوعة" : "مفتوحة"],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-[11px] text-ink-soft/50">{label}</p>
            <p className="mt-1 font-bold">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_0.85fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 bg-ink/[0.025] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-copper/10 text-copper"><Receipt size={17} /></span>
              <div><h2 className="text-sm font-bold">بنود الفاتورة</h2><p className="text-[11px] text-ink-soft/50">بيانات وهمية قابلة للتعديل</p></div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-ink/10 px-3 py-2 text-xs font-bold hover:bg-ink/[0.03]">
              <Upload size={15} /> استيراد Excel
              <input ref={importRef} type="file" accept=".csv,.txt" onChange={handleImport} className="hidden" />
            </label>
          </div>

          <div className="divide-y divide-ink/10">
            {bill.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{item.name}</p>
                  <p className="mt-1 text-[11px] text-ink-soft/50">{item.code} · {item.category} · {money(item.price)} للوحدة</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="flex items-center rounded-xl border border-ink/10">
                    <button onClick={() => changeQuantity(item.id, -1)} disabled={paid} className="px-2.5 py-1.5 text-sm font-bold">−</button>
                    <span className="min-w-7 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => changeQuantity(item.id, 1)} disabled={paid} className="px-2.5 py-1.5 text-sm font-bold">+</button>
                  </div>
                  <span className="w-20 text-left text-sm font-bold">{money(item.total)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-ink/10 bg-paper-2 px-5 py-4">
            <div className="flex justify-between text-xs text-ink-soft/60"><span>المجموع</span><span>{money(subtotal)}</span></div>
            <div className="mt-2 flex justify-between text-xs text-ink-soft/60"><span>الضريبة</span><span>{money(bill.tax)}</span></div>
            <div className="mt-2 flex justify-between text-xs text-ink-soft/60"><span>الخصم</span><span>- {money(bill.discount)}</span></div>
            <div className="mt-4 flex justify-between"><strong className="text-lg">الإجمالي</strong><strong className="text-2xl text-copper-deep">{money(bill.total)}</strong></div>
          </div>
        </Card>

        <Card className="h-fit p-5">
          <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-copper/10 text-copper"><WalletCards size={17} /></span><div><h2 className="text-sm font-bold">الدفع</h2><p className="text-[11px] text-ink-soft/50">اختر الطريقة</p></div></div>
          <div className="mt-4 space-y-2">
            {PAYMENT_METHODS.map((item) => (
              <label key={item.value} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 ${method === item.value ? "border-copper bg-copper/5" : "border-ink/10"} ${paid ? "pointer-events-none opacity-60" : ""}`}>
                <input type="radio" name="payment-method" value={item.value} checked={method === item.value} onChange={(event) => setMethod(event.target.value)} disabled={paid || submitting} />
                <span><span className="block text-sm font-bold">{item.label}</span><span className="block text-[11px] text-ink-soft/50">{item.description}</span></span>
              </label>
            ))}
          </div>
          <Button onClick={handleConfirmPayment} disabled={paid || submitting} className="mt-4 w-full justify-center">
            {submitting ? <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> جارِ تسجيل الدفع…</span> : paid ? <span className="flex items-center gap-2"><CheckCircle2 size={16} /> مدفوعة</span> : <span className="flex items-center gap-2"><CreditCard size={16} /> تأكيد الدفع</span>}
          </Button>
          <button onClick={() => navigate("/cashier/tables")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-ink-soft hover:bg-ink/[0.04]"><ArrowRight size={15} /> العودة للطاولات</button>
        </Card>
      </div>

      <Card className="mt-5 border-copper/15 bg-copper/5 p-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet size={20} className="mt-0.5 shrink-0 text-copper" />
          <div><p className="font-bold">جاهزية التكامل مع الأصيل</p><p className="mt-1 text-xs leading-6 text-ink-soft">هذه النسخة تستخدم بيانات وهمية، لكن نموذج التصدير مرتب كجدول Excel: رقم الفاتورة، التاريخ، الطاولة، الصنف، الكود، التصنيف، الكمية، السعر، الضريبة، الخصم والإجمالي. لاحقًا نربط نفس الجدول بالبيانات الحقيقية.</p></div>
        </div>
      </Card>
    </div>
  );
}
