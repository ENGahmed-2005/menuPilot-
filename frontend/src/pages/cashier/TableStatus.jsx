import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CircleDollarSign, LayoutGrid, Receipt, RefreshCw, Search, WalletCards } from "lucide-react";
import { getTables } from "../../api/tables";
import { getBill } from "../../api/billing";
import { useWaiterRealtime } from "../../hooks/useWaiterRealtime";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";

const money = (v) => `${Number(v || 0).toLocaleString("ar-PS", { maximumFractionDigits: 2 })} ₪`;

const FILTERS = [
  { value: "all", label: "الكل" },
  { value: "occupied", label: "مشغولة" },
  { value: "available", label: "متاحة" },
  { value: "bill", label: "طلب فاتورة" },
];

export default function TableStatus() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const { sessions, connected } = useWaiterRealtime();
  const prevSessionCount = useRef(null);
  // bill summaries keyed by sessionId, fetched when billRequested is true
  const [bills, setBills] = useState({});

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

  // Auto-refresh tables when sessions open or close
  useEffect(() => {
    if (prevSessionCount.current === null) { prevSessionCount.current = sessions.length; return; }
    if (sessions.length !== prevSessionCount.current) {
      prevSessionCount.current = sessions.length;
      loadTables(true);
    }
  }, [sessions.length, loadTables]);

  // Map session ID → session for quick lookup
  const sessionMap = useMemo(() => {
    const map = {};
    for (const s of sessions) map[String(s.id)] = s;
    return map;
  }, [sessions]);

  // Fetch bill summaries for sessions that have requested the bill
  useEffect(() => {
    const pending = sessions.filter((s) => s.billRequested);
    for (const s of pending) {
      const sid = String(s.id);
      if (bills[sid]) continue; // already fetched
      getBill(sid)
        .then((data) => setBills((prev) => ({ ...prev, [sid]: { total: Number(data?.total || 0), outstanding: Number(data?.outstanding || 0), itemCount: (data?.items || []).length } })))
        .catch(() => {}); // ignore errors silently
    }
    // clear bill data for sessions that no longer exist
    setBills((prev) => {
      const activeIds = new Set(sessions.map((s) => String(s.id)));
      const next = {};
      for (const key of Object.keys(prev)) { if (activeIds.has(key)) next[key] = prev[key]; }
      return next;
    });
  }, [sessions]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => ({
    total: tables.length,
    occupied: tables.filter((t) => t.status !== "Available").length,
    available: tables.filter((t) => t.status === "Available").length,
    bill: sessions.filter((s) => s.billRequested).length,
  }), [tables, sessions]);

  const filteredTables = useMemo(() => tables.filter((table) => {
    const session = table.activeSessionId ? sessionMap[String(table.activeSessionId)] : null;
    const matchesQuery = `${table.label || ""} ${table.code || ""}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all"
      || (filter === "available" && table.status === "Available")
      || (filter === "occupied" && table.status !== "Available")
      || (filter === "bill" && session?.billRequested);
    return matchesQuery && matchesFilter;
  }), [tables, query, filter, sessionMap]);

  if (loading) return <Spinner label="جارِ تحميل الطاولات…" />;

  return (
    <div dir="rtl" className="pb-8">
      <PageHeader title="مركز الكاشير" subtitle="تابع حالة الطاولات والمدفوعات من شاشة واحدة." />

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="p-4"><div className="text-xs text-ink-soft/55">إجمالي الطاولات</div><div className="mt-1 text-2xl font-black">{counts.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-ink-soft/55">متاحة</div><div className="mt-1 text-2xl font-black text-herb">{counts.available}</div></Card>
        <Card className="p-4"><div className="text-xs text-ink-soft/55">مشغولة</div><div className="mt-1 text-2xl font-black text-copper-deep">{counts.occupied}</div></Card>
        <Card className="p-4"><div className="text-xs text-ink-soft/55">طلب فاتورة</div><div className="mt-1 text-2xl font-black text-brick">{counts.bill}</div></Card>
      </div>

      <Card className="mt-5 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search size={17} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft/45" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم الطاولة أو QR…" className="w-full rounded-xl border border-ink/10 bg-paper py-2.5 pr-10 pl-3 text-sm outline-none focus:border-copper" />
          </div>
          <div className="flex items-center gap-2">
            {FILTERS.map((item) => <button key={item.value} onClick={() => setFilter(item.value)} className={`rounded-xl px-4 py-2 text-xs font-bold ${filter === item.value ? "bg-ink text-paper" : "bg-ink/[0.04] text-ink-soft"}`}>{item.label}</button>)}
            <button onClick={() => loadTables(true)} disabled={refreshing} className="grid h-10 w-10 place-items-center rounded-xl border border-ink/10"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /></button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft/60">
          <span className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-herb" : "bg-brick"}`} />
          {connected ? "متصل — يتحدث تلقائيًا" : "غير متصل — يعيد الاتصال…"}
        </div>
      </Card>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTables.map((table) => {
          const occupied = table.status !== "Available";
          const session = table.activeSessionId ? sessionMap[String(table.activeSessionId)] : null;
          const bill = session?.billRequested ? bills[String(table.activeSessionId)] : null;

          return (
            <Card key={table.id} className={`overflow-hidden p-0 ${session?.billRequested ? "ring-2 ring-copper/40" : ""}`}>
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

                {session?.customerName && (
                  <div className="mt-1 text-xs text-ink-soft/55">{session.customerName}</div>
                )}

                {session?.assistanceRequested && (
                  <div className="mt-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brick/10 px-2.5 py-1 text-xs font-bold text-brick">
                      <AlertCircle size={12} /> طلب خدمة
                    </span>
                  </div>
                )}

                {session?.billRequested && (
                  <div className="mt-3 rounded-2xl border border-copper/25 bg-copper/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-copper-deep">
                      <WalletCards size={15} /> طلب فاتورة
                    </div>
                    {bill ? (
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-ink-soft/70">
                          <span>عدد الأصناف</span>
                          <span className="font-bold">{bill.itemCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-ink-soft/70">
                          <span>إجمالي الفاتورة</span>
                          <span className="font-bold">{money(bill.total)}</span>
                        </div>
                        {bill.outstanding > 0 && (
                          <div className="flex items-center justify-between border-t border-copper/15 pt-1.5 text-sm font-black text-copper-deep">
                            <span>المبلغ المستحق</span>
                            <span>{money(bill.outstanding)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-ink-soft/55">جارِ تحميل التفاصيل…</div>
                    )}
                  </div>
                )}
              </div>

              {occupied && table.activeSessionId && (
                <div className="border-t border-ink/10 p-4">
                  <Link
                    to={`/cashier/billing/${table.activeSessionId}`}
                    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${session?.billRequested ? "bg-copper text-paper" : "bg-ink text-paper"}`}
                  >
                    <CircleDollarSign size={17} />
                    {session?.billRequested ? "مراجعة الطلبات وتأكيد الدفع" : "عرض الفاتورة"}
                  </Link>
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
