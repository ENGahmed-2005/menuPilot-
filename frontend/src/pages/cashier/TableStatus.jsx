import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, CircleDollarSign, LayoutGrid, Receipt, RefreshCw, Search, Utensils, WalletCards, CheckCircle2 } from "lucide-react";
import { getTables } from "../../api/tables";
import { getBill } from "../../api/billing";
import { useWaiterRealtime } from "../../hooks/useWaiterRealtime";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";
import StatCard from "../../components/dashboard/StatCard";
import Alert from "../../components/ui/Alert";
import Button, { buttonClasses } from "../../components/ui/Button";
import LiveIndicator from "../../components/ui/LiveIndicator";
import SegmentedControl from "../../components/ui/SegmentedControl";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCards, SkeletonStats } from "../../components/ui/Skeleton";
import { errorText } from "../../utils/errors";
import CloseSessionButton from "../../components/billing/CloseSessionButton";
import IdleHint from "../../components/billing/IdleHint";
import { money, tableName } from "../../utils/format";
import { t as tr } from "../../i18n";

// The API returns "available" / "occupied"; older mocks used "Available".
const isAvailable = (table) => String(table.status || "").toLowerCase() === "available";


const FILTERS = [
  { value: "all", label: tr("الكل") },
  { value: "occupied", label: tr("مشغولة") },
  { value: "available", label: tr("متاحة") },
  { value: "bill", label: tr("طلب فاتورة") },
];

export default function TableStatus() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState(null);

  const { sessions, setSessions, connected } = useWaiterRealtime();
  const prevSessionCount = useRef(null);
  // bill summaries keyed by sessionId, fetched when billRequested is true
  const [bills, setBills] = useState({});

  const loadTables = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getTables();
      setTables(data || []);
      setError(null);
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
    occupied: tables.filter((t) => !isAvailable(t)).length,
    available: tables.filter(isAvailable).length,
    bill: sessions.filter((s) => s.billRequested).length,
  }), [tables, sessions]);

  // Tables that need the cashier (bill requested, then waiter call) come first.
  const rank = useCallback((table) => {
    const session = table.activeSessionId ? sessionMap[String(table.activeSessionId)] : null;
    if (session?.billRequested) return 0;
    if (session?.assistanceRequested) return 1;
    return isAvailable(table) ? 3 : 2;
  }, [sessionMap]);

  const filteredTables = useMemo(() => tables.filter((table) => {
    const session = table.activeSessionId ? sessionMap[String(table.activeSessionId)] : null;
    const matchesQuery = `${table.label || ""} ${table.code || ""}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all"
      || (filter === "available" && isAvailable(table))
      || (filter === "occupied" && !isAvailable(table))
      || (filter === "bill" && session?.billRequested);
    return matchesQuery && matchesFilter;
  }).sort((a, b) => rank(a) - rank(b) || String(a.label).localeCompare(String(b.label), "ar", { numeric: true })), [tables, query, filter, sessionMap, rank]);

  // After a close: drop the session and free the table right away; the live
  // feed confirms it within seconds, so no reload is needed.
  function handleClosed(session) {
    setSessions((list) => list.filter((s) => String(s.id) !== String(session.id)));
    setTables((list) => list.map((t) => (String(t.activeSessionId) === String(session.id) ? { ...t, status: "available", activeSessionId: null } : t)));
  }

  if (loading) return (
    <div className="space-y-5">
      <PageHeader title={tr("الطاولات والفواتير")} subtitle={tr("تابع حالة الطاولات واستلم الفواتير من شاشة واحدة.")} />
      <SkeletonStats />
      <SkeletonCards count={6} />
    </div>
  );

  return (
    <div className="pb-8">
      <PageHeader
        title={tr("الطاولات والفواتير")}
        subtitle={tr("الطاولات التي طلبت الفاتورة تظهر أولًا. افتح الفاتورة لمراجعة الطلبات وتسجيل الدفع.")}
        meta={<LiveIndicator connected={connected} />}
        action={<Button variant="secondary" size="sm" onClick={() => loadTables(true)} loading={refreshing}><RefreshCw size={15} aria-hidden="true" /> {tr("تحديث")}</Button>}
      />

      {error && (
        <Alert tone="danger" className="mb-4" action={<Button size="sm" variant="secondary" onClick={() => loadTables()}>{tr("إعادة المحاولة")}</Button>}>
          {errorText(error, tr("تعذّر تحميل الطاولات."))}
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={LayoutGrid} label={tr("كل الطاولات")} value={counts.total} onClick={() => setFilter("all")} active={filter === "all"} />
        <StatCard icon={CheckCircle2} tone="herb" label={tr("متاحة")} value={counts.available} onClick={() => setFilter("available")} active={filter === "available"} />
        <StatCard icon={Utensils} tone="copper" label={tr("مشغولة")} value={counts.occupied} onClick={() => setFilter("occupied")} active={filter === "occupied"} />
        <StatCard icon={WalletCards} tone="brick" label={tr("طلبت الفاتورة")} value={counts.bill} onClick={() => setFilter("bill")} active={filter === "bill"} emphasis={counts.bill > 0} />
      </div>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative flex-1 md:max-w-sm">
          <span className="sr-only">{tr("ابحث عن طاولة")}</span>
          <Search size={17} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("ابحث باسم الطاولة أو رمزها")} className="h-11 w-full rounded-[var(--radius-control)] border border-line bg-surface pr-10 pl-3 text-sm outline-none focus:border-copper focus:ring-2 focus:ring-copper/25" />
        </label>
        <SegmentedControl label={tr("تصفية الطاولات")} value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ ...f, count: { all: counts.total, occupied: counts.occupied, available: counts.available, bill: counts.bill }[f.value] }))} />
      </div>

      <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filteredTables.map((table) => {
          const occupied = !isAvailable(table);
          const session = table.activeSessionId ? sessionMap[String(table.activeSessionId)] : null;
          const bill = session?.billRequested ? bills[String(table.activeSessionId)] : null;

          return (
            <Card as="li" key={table.id} className={`flex flex-col overflow-hidden p-0 ${session?.billRequested ? "border-copper ring-2 ring-copper/30" : ""}`}>
              <div className="flex-1 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-extrabold text-ink">{tableName(table.label)}</p>
                    <p className="mt-0.5 text-xs text-muted" dir="ltr">{table.code}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge type="table" status={occupied ? "occupied" : "available"} />
                    {session?.lifecycle && session.lifecycle !== "active" && <StatusBadge type="lifecycle" status={session.lifecycle} />}
                  </div>
                </div>

                <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
                  <Receipt size={16} aria-hidden="true" className="text-muted" />
                  {table.activeSessionId ? <>{tr("جلسة")} <span className="num">#{table.activeSessionId}</span>{session?.customerName && <span className="text-muted">{tr("،")} {session.customerName}</span>}</> : tr("لا يوجد زبائن على الطاولة")}
                </p>

                {session && session.billTotal > 0 && (
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                    <span>{tr("الإجمالي")} <b className="num text-ink">{money(session.billTotal)}</b></span>
                    <span>{tr("المدفوع")} <b className="num text-herb">{money(session.paidTotal)}</b></span>
                    <span>{tr("المتبقي")} <b className="num text-ink">{money(session.outstanding)}</b></span>
                  </p>
                )}

                <IdleHint session={session} />

                {session?.assistanceRequested && (
                  <div className="mt-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brick/10 px-2.5 py-1 text-xs font-bold text-brick">
                      <BellRing size={13} aria-hidden="true" /> {tr("تطلب نادلًا")}
                    </span>
                  </div>
                )}

                {session?.billRequested && (
                  <div className="mt-3 rounded-2xl border border-copper/25 bg-copper/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-copper-ink">
                      <WalletCards size={15} aria-hidden="true" /> {tr("طلبت الفاتورة")}
                    </div>
                    {bill ? (
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-muted">
                          <span>{tr("عدد الأصناف")}</span>
                          <span className="font-bold">{bill.itemCount}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted">
                          <span>{tr("إجمالي الفاتورة")}</span>
                          <span className="num font-bold text-ink">{money(bill.total)}</span>
                        </div>
                        {bill.outstanding > 0 && (
                          <div className="flex items-center justify-between border-t border-copper/20 pt-1.5 text-sm font-extrabold text-ink">
                            <span>{tr("المبلغ المستحق")}</span>
                            <span className="num">{money(bill.outstanding)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2" aria-hidden="true"><div className="skeleton h-3 w-full" /><div className="skeleton h-3 w-2/3" /></div>
                    )}
                  </div>
                )}
              </div>

              {occupied && table.activeSessionId && (
                <div className="space-y-2 border-t border-line p-4">
                  <Link
                    to={`/cashier/billing/${table.activeSessionId}`}
                    className={buttonClasses({ variant: session?.billRequested ? "primary" : "secondary", block: true })}
                  >
                    <CircleDollarSign size={17} aria-hidden="true" />
                    {session?.billRequested ? tr("مراجعة الفاتورة وتسجيل الدفع") : tr("عرض الفاتورة")}
                  </Link>
                  {session && <CloseSessionButton block session={{ ...session, tableLabel: table.label }} onClosed={handleClosed} />}
                </div>
              )}
            </Card>
          );
        })}
      </ul>

      {!filteredTables.length && !error && (
        <Card className="mt-5">
          {tables.length === 0 ? (
            <EmptyState icon={LayoutGrid} title={tr("لا توجد طاولات بعد")} description={tr("يضيف صاحب المطعم الطاولات ورموز QR من لوحة المالك، وستظهر هنا تلقائيًا.")} />
          ) : (
            <EmptyState icon={Search} title={tr("لا توجد طاولات مطابقة")} description={tr("غيّر كلمة البحث أو التصفية لعرض طاولات أخرى.")}
              action={<Button variant="secondary" size="sm" onClick={() => { setQuery(""); setFilter("all"); }}>{tr("مسح البحث والتصفية")}</Button>} />
          )}
        </Card>
      )}
    </div>
  );
}
