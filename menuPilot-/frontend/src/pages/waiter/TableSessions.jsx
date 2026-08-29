/* ==========================================================================
   TableSessions.jsx — لوحة النادل: الجلسات النشطة وطلبات المساعدة
   يغطي: FR-26 (رؤية حالة الطاولة), FR-41 (استقبال طلبات المساعدة)
   ========================================================================== */
import { useEffect, useState } from "react";
import { Bell, LayoutGrid } from "lucide-react";
import { getActiveSessions } from "../../api/sessions";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";

export default function TableSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const data = await getActiveSessions();
        if (!cancelled) setSessions(data ?? []);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    poll();
    const id = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (loading) return <Spinner label="جارِ تحميل الطاولات…" />;
  if (error)
    return (
      <p role="alert" className="rounded-lg bg-brick/10 px-3 py-2 text-sm text-brick">
        {error.message}
      </p>
    );

  const needHelpCount = sessions.filter((s) => s.assistanceRequested).length;

  return (
    <div>
      <PageHeader
        title="الطاولات النشطة"
        subtitle={needHelpCount > 0 ? `${needHelpCount} طاولة بحاجة لمساعدة الآن` : "كل الطاولات تحت السيطرة."}
      />

      {sessions.length === 0 ? (
        <Card>
          <EmptyState icon={LayoutGrid} title="لا توجد جلسات نشطة حاليًا" />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => (
            <Card
              key={s.id}
              as="li"
              className={`flex items-center justify-between gap-3 p-4 ${
                s.assistanceRequested ? "border-brick/40 bg-brick/5" : ""
              }`}
            >
              <div>
                <span className="block font-medium text-ink">طاولة {s.tableLabel}</span>
                <Badge tone="neutral">{s.status}</Badge>
              </div>
              {s.assistanceRequested && (
                <strong className="flex items-center gap-1.5 text-sm font-medium text-brick">
                  <Bell size={15} aria-hidden="true" />
                  بحاجة لمساعدة
                </strong>
              )}
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
