import { useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, Receipt, TrendingUp, Upload, WalletCards } from "lucide-react";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";

const initialInvoices = [
  { id: "INV-1042", date: "2026-09-09", table: "طاولة 04", customer: "عميل مباشر", total: 86, paid: 86, method: "cash", status: "paid" },
  { id: "INV-1041", date: "2026-09-09", table: "طاولة 07", customer: "عميل مباشر", total: 124, paid: 124, method: "electronic", status: "paid" },
  { id: "INV-1040", date: "2026-09-09", table: "طاولة 02", customer: "عميل مباشر", total: 58, paid: 30, method: "cash", status: "partial" },
  { id: "INV-1039", date: "2026-09-08", table: "طاولة 05", customer: "عميل مباشر", total: 172, paid: 172, method: "electronic", status: "paid" },
  { id: "INV-1038", date: "2026-09-08", table: "طاولة 01", customer: "عميل مباشر", total: 64, paid: 64, method: "cash", status: "paid" },
  { id: "INV-1037", date: "2026-09-08", table: "طاولة 09", customer: "عميل مباشر", total: 215, paid: 215, method: "electronic", status: "paid" },
];

const tableSales = Array.from({ length: 12 }, (_, index) => {
  const tableNumber = String(index + 1).padStart(2, "0");
  const tableInvoices = initialInvoices.filter((item) => item.table === `طاولة ${tableNumber}`);
  const total = tableInvoices.reduce((sum, item) => sum + item.total, 0);
  const paid = tableInvoices.reduce((sum, item) => sum + item.paid, 0);
  return {
    table: `طاولة ${tableNumber}`,
    invoices: tableInvoices.length,
    total: total || (index + 1) * 37,
    paid: paid || (index + 1) * 31,
    remaining: Math.max((total || (index + 1) * 37) - (paid || (index + 1) * 31), 0),
  };
});

const paymentLabels = { cash: "نقدًا", electronic: "إلكتروني", ussd: "USSD" };
const money = (value) => `${Number(value || 0).toLocaleString("ar-PS", { maximumFractionDigits: 2 })} ₪`;

function downloadCsv(rows, filename) {
  const csv = "\uFEFF" + rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseImportedInvoices(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  return lines.slice(1).map((line, index) => {
    const cells = line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
    const [id, date, table, customer, total, paid, method] = cells;
    const numericTotal = Number(total) || 0;
    const numericPaid = Number(paid) || 0;
    return {
      id: id || `IMP-${Date.now()}-${index}`,
      date: date || new Date().toISOString().slice(0, 10),
      table: table || "طاولة غير محددة",
      customer: customer || "عميل مباشر",
      total: numericTotal,
      paid: numericPaid,
      method: method === "إلكتروني" ? "electronic" : method === "USSD" ? "ussd" : "cash",
      status: numericPaid >= numericTotal ? "paid" : "partial",
    };
  }).filter((item) => item.total > 0);
}

export default function SalesReports() {
  const [period, setPeriod] = useState("today");
  const [invoices, setInvoices] = useState(initialInvoices);
  const [importMessage, setImportMessage] = useState("");
  const fileInputRef = useRef(null);
  const visibleInvoices = useMemo(() => period === "today" ? invoices.filter((item) => item.date === "2026-09-09") : invoices, [period, invoices]);
  const totals = useMemo(() => visibleInvoices.reduce((acc, item) => ({ total: acc.total + item.total, paid: acc.paid + item.paid, count: acc.count + 1 }), { total: 0, paid: 0, count: 0 }), [visibleInvoices]);
  const cashTotal = visibleInvoices.filter((item) => item.method === "cash").reduce((sum, item) => sum + item.paid, 0);
  const electronicTotal = visibleInvoices.filter((item) => item.method === "electronic").reduce((sum, item) => sum + item.paid, 0);

  function exportInvoices() {
    downloadCsv([
      ["رقم الفاتورة", "التاريخ", "الطاولة", "العميل", "الإجمالي", "المبلغ المدفوع", "المتبقي", "طريقة الدفع", "الحالة"],
      ...visibleInvoices.map((item) => [item.id, item.date, item.table, item.customer, item.total, item.paid, item.total - item.paid, paymentLabels[item.method], item.status === "paid" ? "مدفوعة" : "جزئية"]),
    ], `menupilot-sales-${period}.csv`);
  }

  function exportAllTables() {
    downloadCsv([
      ["الطاولة", "عدد الفواتير", "إجمالي المبيعات", "المبلغ المحصل", "المبلغ المتبقي"],
      ...tableSales.map((item) => [item.table, item.invoices, item.total, item.paid, item.remaining]),
      [],
      ["إجمالي جميع الطاولات", tableSales.reduce((sum, item) => sum + item.invoices, 0), tableSales.reduce((sum, item) => sum + item.total, 0), tableSales.reduce((sum, item) => sum + item.paid, 0), tableSales.reduce((sum, item) => sum + item.remaining, 0)],
    ], "menupilot-all-tables-sales.csv");
  }

  function exportAccounting() {
    downloadCsv([
      ["التقرير", "القيمة"],
      ["إجمالي المبيعات", totals.total],
      ["المبلغ المحصل", totals.paid],
      ["المبالغ المتبقية", totals.total - totals.paid],
      ["المبيعات النقدية المحصلة", cashTotal],
      ["المبيعات الإلكترونية المحصلة", electronicTotal],
      ["عدد الفواتير", totals.count],
    ], `menupilot-accounting-${period}.csv`);
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = parseImportedInvoices(await file.text());
      if (!imported.length) {
        setImportMessage("لم يتم العثور على فواتير صالحة في الملف.");
      } else {
        setInvoices((current) => [...imported, ...current]);
        setImportMessage(`تم استيراد ${imported.length} فاتورة بنجاح.`);
      }
    } catch {
      setImportMessage("تعذر قراءة ملف الفواتير.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div dir="rtl" className="mx-auto max-w-6xl pb-8">
      <PageHeader title="المبيعات والمحاسبة" subtitle="تقارير الفواتير والتحصيل والتصدير إلى Excel — بيانات تجريبية حاليًا." />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {[{ value: "today", label: "اليوم" }, { value: "all", label: "كل الفواتير" }].map((item) => (
          <button key={item.value} onClick={() => setPeriod(item.value)} className={`rounded-xl px-4 py-2 text-sm font-bold ${period === item.value ? "bg-ink text-paper" : "border border-ink/10 bg-paper text-ink-soft"}`}>
            {item.label}
          </button>
        ))}
        <div className="mr-auto flex flex-wrap gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-ink/10 bg-paper px-4 py-2.5 text-sm font-bold hover:bg-ink/[0.03]"><Upload size={16} /> استيراد فاتورة</button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />
          <button onClick={exportAllTables} className="flex items-center gap-2 rounded-xl bg-herb px-4 py-2.5 text-sm font-bold text-white"><FileSpreadsheet size={16} /> تصدير Excel لكل الطاولات</button>
        </div>
      </div>

      {importMessage && <div className="mb-5 rounded-xl border border-herb/15 bg-herb/5 px-4 py-3 text-sm font-bold text-herb">{importMessage}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={TrendingUp} label="إجمالي المبيعات" value={money(totals.total)} />
        <Stat icon={WalletCards} label="المبلغ المحصل" value={money(totals.paid)} />
        <Stat icon={Receipt} label="المتبقي" value={money(totals.total - totals.paid)} />
        <Stat icon={FileSpreadsheet} label="عدد الفواتير" value={totals.count} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_0.7fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-5 py-4">
            <div><h2 className="font-bold">تقرير المبيعات</h2><p className="mt-1 text-xs text-ink-soft/50">الفواتير والتحصيل وحالة الدفع</p></div>
            <button onClick={exportInvoices} className="flex items-center gap-2 rounded-xl bg-herb px-4 py-2.5 text-sm font-bold text-white"><Download size={16} /> تصدير الفواتير Excel</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-sm">
              <thead className="bg-ink/[0.025] text-xs text-ink-soft/60"><tr><th className="px-5 py-3">الفاتورة</th><th>التاريخ</th><th>الطاولة</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الدفع</th><th>الحالة</th></tr></thead>
              <tbody className="divide-y divide-ink/10">{visibleInvoices.map((item) => <tr key={item.id} className="hover:bg-ink/[0.02]"><td className="px-5 py-4 font-bold">{item.id}</td><td>{item.date}</td><td>{item.table}</td><td>{money(item.total)}</td><td className="font-bold text-herb">{money(item.paid)}</td><td className="font-bold text-copper-deep">{money(item.total - item.paid)}</td><td>{paymentLabels[item.method]}</td><td><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${item.status === "paid" ? "bg-herb/10 text-herb" : "bg-copper/10 text-copper-deep"}`}>{item.status === "paid" ? "مدفوعة" : "جزئية"}</span></td></tr>)}</tbody>
            </table>
          </div>
        </Card>

        <Card className="h-fit p-5">
          <h2 className="font-bold">التقارير المحاسبية</h2>
          <p className="mt-1 text-xs leading-5 text-ink-soft/55">ملخص جاهز للتصدير واستخدامه لاحقًا مع الأصيل.</p>
          <div className="mt-4 space-y-3">
            <Summary label="النقدي المحصل" value={money(cashTotal)} />
            <Summary label="الإلكتروني المحصل" value={money(electronicTotal)} />
            <Summary label="إجمالي التحصيل" value={money(totals.paid)} />
            <Summary label="المبالغ غير المحصلة" value={money(totals.total - totals.paid)} />
          </div>
          <button onClick={exportAccounting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-ink/10 px-4 py-3 text-sm font-bold hover:bg-ink/[0.03]"><FileSpreadsheet size={17} /> تصدير التقرير المحاسبي</button>
        </Card>
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <div><h2 className="font-bold">مبيعات جميع الطاولات</h2><p className="mt-1 text-xs text-ink-soft/50">ملخص مستقل لكل الطاولات، جاهز للتصدير.</p></div>
          <button onClick={exportAllTables} className="flex items-center gap-2 rounded-xl border border-ink/10 px-4 py-2.5 text-sm font-bold hover:bg-ink/[0.03]"><Download size={16} /> تصدير شامل Excel</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-right text-sm">
            <thead className="bg-ink/[0.025] text-xs text-ink-soft/60"><tr><th className="px-5 py-3">الطاولة</th><th>عدد الفواتير</th><th>إجمالي المبيعات</th><th>المحصل</th><th>المتبقي</th></tr></thead>
            <tbody className="divide-y divide-ink/10">{tableSales.map((item) => <tr key={item.table}><td className="px-5 py-3 font-bold">{item.table}</td><td>{item.invoices}</td><td>{money(item.total)}</td><td className="font-bold text-herb">{money(item.paid)}</td><td className="font-bold text-copper-deep">{money(item.remaining)}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) { return <Card className="p-5"><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-copper/10 text-copper"><Icon size={19} /></span><span className="text-xs text-ink-soft/50">تقرير</span></div><p className="mt-4 text-xs text-ink-soft/60">{label}</p><p className="mt-1 text-xl font-black">{value}</p></Card>; }
function Summary({ label, value }) { return <div className="flex items-center justify-between rounded-xl bg-ink/[0.025] px-3.5 py-3"><span className="text-xs text-ink-soft/65">{label}</span><strong className="text-sm">{value}</strong></div>; }
