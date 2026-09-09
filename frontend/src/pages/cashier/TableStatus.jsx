import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, LayoutGrid, Receipt, RefreshCw, Search, WalletCards } from "lucide-react";
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

export default function TableStatus() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const loadTables = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setTables(await getTables());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const occupied = tables.filter((table) => table.status !== "Available");
  const available = tables.length - occupied.length;

  const filteredTables = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tables.filter((table) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "occupied" && table.status !== "Available") ||
        (filter === "available" && table.status === "Available");
      const text = `${table.label || ""} ${table.code || ""}`.toLowerCase();
      return matchesFilter && (!normalized || text.includes(normalized));
    });
  }, [tables, query, filter]);

  if (loading) return <Spinner label="جارِ تحميل الكاشير…" />;

  return (
    <div dir="rtl">
      <PageHeader
        title="مركز الكاشير"
        subtitle="تابع حالة الطاولات وافتح الفواتير وابدأ عملية الدفع بسرعة."
      />

      {error && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brick/15 bg-brick/10 px-4 py-3 text-sm text-brick">
          <span>{error.message || "تعذر تحميل بيانات الطاولات."}</span>
          <button onClick={() => loadTables()} className="font-bold underline">
            حاول مرة أخرى
          </button>
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          [LayoutGrid, "إجمالي الطاولات", tables.length],
          [CheckCircle2, "متاحة", available],
          [WalletCards, "مشغولة", occupied.length],
        ].map(([Icon, label, value]) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-copper/10 text-copper">
                <Icon size={19} />
              </span>
              <strong className="text-2xl">{value}</strong>
            </div>
            <p className="mt-3 text-xs text-ink-soft/60">{label}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-5 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-ink/10 bg-paper-2 px-3.5 py-2.5">
            <Search size={18} className="shrink-0 text-ink-soft/50" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث برقم أو اسم الطاولة…"
              aria-label="البحث عن طاولة"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-soft/45"
            />
          </label>
          <button
            onClick={() => loadTables(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 rounded-xl border border-ink/10 px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-ink/[0.04] disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            تحديث
          </button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${filter === item.value ? "bg-ink text-paper" : "bg-paper-2 text-ink-soft hover:bg-ink/5"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">الطاولات</h2>
          <p className="mt-1 text-xs text-ink-soft/55">{filteredTables.length} من {tables.length} طاولة</p>
        </div>
      </div>

      {filteredTables.length === 0 ? (
        <Card className="p-10 text-center">
          <Search className="mx-auto text-ink-soft/30" size={30} />
          <p className="mt-3 font-bold">لا توجد طاولات مطابقة</p>
          <p className="mt-1 text-sm text-ink-soft/55">جرّب البحث بكلمة مختلفة أو غيّر الفلتر.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTables.map((table) => {
            const isAvailable = table.status === "Available";
            return (
              <Card key={table.id} className="overflow-hidden p-0">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong className="text-lg">{table.label}</strong>
                      <p className="mt-1 text-xs text-ink-soft/55">QR: {table.code}</p>
                    </div>
                    <Badge tone={isAvailable ? "good" : "warning"}>
                      {isAvailable ? "متاحة" : "مشغولة"}
                    </Badge>
                  </div>

                  <div className="mt-5 rounded-2xl bg-paper-2 p-3 text-xs text-ink-soft/65">
                    {table.activeSessionId ? "هناك جلسة نشطة — الفاتورة جاهزة للمراجعة." : "لا توجد جلسة نشطة حاليًا."}
                  </div>

                  {table.activeSessionId ? (
                    <Link
                      to={`/cashier/billing/${table.activeSessionId}`}
                      className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-paper transition hover:bg-ink-soft"
                    >
                      <Receipt size={16} /> فتح الفاتورة
                    </Link>
                  ) : (
                    <div className="mt-3 rounded-xl border border-dashed border-ink/10 px-4 py-3 text-center text-xs text-ink-soft/45">
                      بانتظار جلسة جديدة
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
