/* ==========================================================================
   TableSessions.jsx — waiter hub (US-11, US-16).
   Answers "who needs me right now?": tables calling a waiter come first,
   then bill requests, then everyone else. Updates live.
   ========================================================================== */
import { useEffect, useMemo, useState } from "react";
import { BellRing, Check, HandPlatter, Receipt, Users } from "lucide-react";
import { getActiveSessions, resolveSessionAssistance } from "../../api/sessions";
import { useWaiterRealtime } from "../../hooks/useWaiterRealtime";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";
import StatCard from "../../components/dashboard/StatCard";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import LiveIndicator from "../../components/ui/LiveIndicator";
import StatusBadge from "../../components/ui/StatusBadge";
import { SkeletonCards, SkeletonStats } from "../../components/ui/Skeleton";
import { errorText } from "../../utils/errors";
import { tableName } from "../../utils/format";

const priority = (s) => (s.assistanceRequested ? 0 : s.billRequested ? 1 : 2);
const sinceLabel = (iso) => {
  if (!iso) return null;
  const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? "الآن" : `منذ ${m} د`;
};

export default function TableSessions() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [filter, setFilter] = useState("all");
  const { sessions, setSessions, connected } = useWaiterRealtime([]);

  useEffect(() => {
    getActiveSessions().then((data) => setSessions(data || [])).catch(setError).finally(() => setLoading(false));
  }, [setSessions]);

  const counts = useMemo(() => ({
    all: sessions.length,
    help: sessions.filter((s) => s.assistanceRequested).length,
    bill: sessions.filter((s) => s.billRequested).length,
  }), [sessions]);

  const shown = useMemo(() => [...sessions]
    .filter((s) => filter === "all" || (filter === "help" ? s.assistanceRequested : s.billRequested))
    .sort((a, b) => priority(a) - priority(b) || String(a.tableLabel || a.table_label).localeCompare(String(b.tableLabel || b.table_label), "ar", { numeric: true })), [sessions, filter]);

  async function resolve(id) {
    setResolving(id);
    // Optimistic: clear the alert immediately; the live stream confirms it.
    setSessions((list) => list.map((s) => (s.id === id ? { ...s, assistanceRequested: false, assistanceRequest: null } : s)));
    try { await resolveSessionAssistance(id); } catch (err) { setError(err); } finally { setResolving(null); }
  }

  return (
    <div>
      <PageHeader
        title="الطاولات والطلبات"
        subtitle="الطاولات التي تطلب نادلًا تظهر أولًا، ثم طلبات الفاتورة."
        meta={<LiveIndicator connected={connected} />}
      />

      {error && <Alert tone="danger" className="mb-4" onDismiss={() => setError(null)}>{errorText(error, "تعذّر تحميل الطاولات.")}</Alert>}

      {loading ? <SkeletonStats count={3} /> : (
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Users} label="جلسات نشطة" value={counts.all} onClick={() => setFilter("all")} active={filter === "all"} />
          <StatCard icon={BellRing} tone="brick" label="تطلب نادلًا" value={counts.help} onClick={() => setFilter("help")} active={filter === "help"} emphasis={counts.help > 0} />
          <StatCard icon={Receipt} tone="copper" label="طلب فاتورة" value={counts.bill} onClick={() => setFilter("bill")} active={filter === "bill"} />
        </div>
      )}

      <div className="mt-5">
        {loading ? <SkeletonCards count={6} cardClassName="h-40" /> : shown.length === 0 ? (
          <Card>
            <EmptyState
              icon={HandPlatter}
              title={filter === "all" ? "لا توجد طاولات نشطة الآن" : "لا توجد طلبات بانتظارك"}
              description={filter === "all" ? "عندما يمسح زبون رمز QR على طاولته تظهر جلسته هنا فورًا." : "سيصلك التنبيه هنا لحظة طلب أي طاولة."}
              action={filter !== "all" && <Button variant="secondary" size="sm" onClick={() => setFilter("all")}>عرض كل الطاولات</Button>}
            />
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((s) => (
              <li key={s.id}>
                <Card className={`flex h-full flex-col p-4 ${s.assistanceRequested ? "border-brick/50 ring-1 ring-brick/30" : s.billRequested ? "border-copper/50" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-extrabold text-ink">{tableName(s.tableLabel || s.table_label)}</p>
                      <p className="mt-0.5 truncate text-sm text-muted">{s.customerName || s.customer_name || "زبون"}</p>
                    </div>
                    <StatusBadge type="session" status={s.status} />
                  </div>

                  {s.assistanceRequested ? (
                    <div className="mt-4 rounded-xl bg-brick/[0.08] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-sm font-extrabold text-brick">
                          <BellRing size={17} className="animate-pulse-soft" aria-hidden="true" /> تطلب نادلًا
                          <span className="text-xs font-bold text-brick/80">{sinceLabel(s.assistanceRequest?.created_at)}</span>
                        </p>
                      </div>
                      {s.assistanceRequest?.note && <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-sm font-bold text-ink">«{s.assistanceRequest.note}»</p>}
                      <Button block size="md" variant="dark" className="mt-3" loading={resolving === s.id} onClick={() => resolve(s.id)}>
                        <Check size={17} aria-hidden="true" /> تمت الخدمة
                      </Button>
                    </div>
                  ) : s.billRequested ? (
                    <p className="mt-4 flex items-center gap-2 rounded-xl bg-copper/10 p-3 text-sm font-extrabold text-copper-ink">
                      <Receipt size={17} aria-hidden="true" /> طلبت الفاتورة، والكاشير يستلمها الآن
                    </p>
                  ) : (
                    <p className="mt-auto pt-4 text-sm text-muted">لا توجد طلبات معلّقة</p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
