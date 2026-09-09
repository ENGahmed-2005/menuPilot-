import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, CircleDollarSign, LayoutGrid, Receipt, RefreshCw, Search, WalletCards } from "lucide-react";
import { getTables } from "../../api/tables";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";

const FILTERS = [
  { value: "all", label: "الكل" },
  { value: "occupied", label: "مشغولة" },
  { value: "available", label: "متاحة" },
];

const MOCK_PAYMENT = {
  101: { total: 86.5, paid: 50, method: "نقدًا" },
  102: { total: 124, paid: 0, method: "لم يتم الدفع" },
  103: { total: 57.5, paid: 57.5, method: "إلكتروني" },
};

const money = (value) => `${Number(value || 0).toLocaleString("ar-PS", { maximumFractionDigits: 2 })} ₪`;

export default function TableStatus() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const loadTables = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getTables();
      setTables(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const counts = useMemo(() => ({
    total: tables.length,
    occupied: tables.filter((table) => table.status !== "Available").length,
    available: tables.filter((table) => table.status === "Available").length,
  }), [tables]);

  const filteredTables = useMemo(() => tables.filter((table) => {
    const matchesQuery = `${table.label || ""} ${table.code || ""}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all"
      || (filter === "available" && table.status === "Available")
      || (filter === "occupied" && table.status !== "Available");
    return matchesQuery && matchesFilter;
  }), [tables, query, filter]);

  if (loading) return <Spinner label="جارِ تحميل الطاولات…" />;

  return (
    <div dir="rtl" className="pb-8">
      <PageHeader title="مركز الكاشير" subtitle="تابع حالة الطاولات والمدفوعات من شاشة واحدة." />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><div className="text-xs text-ink-soft/55">إجمالي الطاولات</div><div className="mt-1 text-2xl font-black">{counts.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-ink-soft/55">متاحة</div><div className="mt-1 text-2xl font-black text-herb">{counts.available}</div></Card>
        <Card className="p-4"><div className="text-xs text-ink-soft/55">مشغولة</div><div className="mt-1 text-2xl font-black text-copper-deep">{counts.occupied}</div></Card>
      </div>

      <Card className="mt-5 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search size={17} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft/45" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم الطاولة أو QR…" className="w-full rounded-xl border border-ink/10 bg-paper py-2.5 pr-10 pl-3 text-sm outline-none focus:border-copper" />
          </div>
          <div className="flex items-center gap-2">
            {FILTERS.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`rounded-xl px-4 py-2 text-xs font-bold ${filter === item.value ? "bg-ink text-paper" : "bg-ink/[0.04] text-ink-soft"}`}>{item.label}</button>)}
            <button onClick={() => loadTables(true)} disabled={refreshing} className="grid h-10 w-10 place-items-center rounded-xl border border-ink/10"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /></button>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTables.map((table) => {
          const occupied = table.status !== "Available";
          const payment = table.activeSessionId ? (MOCK_PAYMENT[Number(table.activeSessionId)] || { total: 98, paid: 0, method: "لم يتم الدفع" }) : null;
          const remaining = payment ? Math.max(payment.total - payment.paid, 0) : 0;
          const paid = payment && payment.paid >= payment.total;

          return (
            <Card key={table.id} className="overflow-hidden p-0">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2"><LayoutGrid size={17} className="text-copper" /><div className="text-lg font-black">{table.label}</div></div>
                    <div className="mt-1 text-xs text-ink-soft/50">QR: {table.code}</div>
                  </div>
                  <Badge tone={occupied ? "warning" : "good"}>{occupied ? "مشغولة" : "متاحة"}</Badge>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
                  <Receipt size={16} />
                  {table.activeSessionId ? `جلسة #${table.activeSessionId}` : "لا توجد جلسة نشطة"}
                </div>

                {occupied && payment && (
                  <div className="mt-4 rounded-2xl border border-ink/10 bg-paper-2 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-soft/60">إجمالي الفاتورة</span>
                      <strong>{money(payment.total)}</strong>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-ink-soft/60">المبلغ المدفوع</span>
                      <strong className={payment.paid > 0 ? "text-herb" : "text-ink"}>{money(payment.paid)}</strong>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-ink/10 pt-2">
                      <span className="text-xs font-bold text-ink-soft/60">المتبقي</span>
                      <strong className={remaining ? "text-copper-deep" : "text-herb"}>{money(remaining)}</strong>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-ink-soft/60">
                      <WalletCards size={14} /> طريقة الدفع: {payment.method}
                    </div>
                  </div>
                )}
              </div>

              {occupied && table.activeSessionId && (
                <div className="border-t border-ink/10 p-4">
                  {paid ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl bg-herb/10 px-4 py-3 text-sm font-bold text-herb"><CheckCircle2 size={17} /> تم تأكيد الدفع</div>
                  ) : (
                    <Link to={`/cashier/billing/${table.activeSessionId}`} className="flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-paper"><CircleDollarSign size={17} /> تأكيد الدفع · {money(remaining)}</Link>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {!filteredTables.length && <Card className="mt-5 p-10 text-center text-sm text-ink-soft">لا توجد طاولات مطابقة للبحث الحالي.</Card>}
    </div>
  );
}
