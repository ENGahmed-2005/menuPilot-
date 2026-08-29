/* ==========================================================================
   TableStatus.jsx — نظرة عامة على حالة كل الطاولات للكاشير
   يغطي: FR-32 (تحرير الطاولة تلقائيًا بعد إغلاق الجلسة — معروض هنا للقراءة فقط)
   ========================================================================== */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LayoutGrid, Receipt } from "lucide-react";
import { getTables } from "../../api/tables";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";

export default function TableStatus() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getTables()
      .then(setTables)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="جارِ تحميل الطاولات…" />;
  if (error)
    return (
      <p role="alert" className="rounded-lg bg-brick/10 px-3 py-2 text-sm text-brick">
        {error.message}
      </p>
    );

  return (
    <div>
      <PageHeader title="الطاولات" subtitle="حالة كل طاولة، وانتقال سريع لفاتورة أي طاولة مشغولة." />

      {tables.length === 0 ? (
        <Card>
          <EmptyState icon={LayoutGrid} title="لا توجد طاولات" />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => (
            <Card key={t.id} as="li" className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-ink">{t.label}</span>
                <Badge tone={t.status === "Available" ? "good" : "warning"}>{t.status}</Badge>
              </div>
              {t.activeSessionId ? (
                <Link
                  to={`/cashier/billing/${t.activeSessionId}`}
                  className="mt-1 flex items-center gap-1.5 border-t border-ink/8 pt-3 text-sm font-medium text-copper-deep hover:underline"
                >
                  <Receipt size={14} aria-hidden="true" />
                  الذهاب للفاتورة
                  <ArrowLeft size={13} aria-hidden="true" className="mr-auto" />
                </Link>
              ) : (
                <div className="mt-1 border-t border-ink/8 pt-3 text-xs text-ink-soft/60">لا توجد جلسة نشطة</div>
              )}
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
