import { useEffect, useState } from "react";
import { Bell, LayoutGrid, Check, Clock3, Users } from "lucide-react";
import { getActiveSessions } from "../../api/sessions";
import { useWaiterRealtime } from "../../hooks/useWaiterRealtime";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";

export default function TableSessions() {
  const [initial, setInitial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { sessions, setSessions, connected } = useWaiterRealtime(initial);

  useEffect(() => {
    getActiveSessions().then((data) => { setInitial(data || []); setSessions(data || []); }).catch(setError).finally(() => setLoading(false));
  }, [setSessions]);

  const help = sessions.filter((s) => s.assistanceRequested).length;
  const occupied = sessions.length;

  function resolve(id) {
    setSessions((current) => current.map((session) => session.id === id ? { ...session, assistanceRequested: false } : session));
  }

  if (loading) return <Spinner label="جارِ تحميل الطاولات…"/>;
  return <div dir="rtl">
    <PageHeader title="مركز النادل" subtitle="تحديث لحظي للجلسات وطلبات المساعدة، بدون انتظار 4 ثوانٍ بين كل طلب وآخر."/>
    {error && <p className="mb-4 rounded-xl bg-brick/10 p-3 text-sm text-brick">{error.message}</p>}
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      {[[Users,"الجلسات النشطة",occupied],[Bell,"طلبات المساعدة",help],[Clock3,"الاتصال","لحظي"]].map(([I,l,v]) => <Card key={l} className="p-4"><I size={18} className={connected ? "text-herb" : "text-copper"}/><p className="mt-2 text-xs text-ink-soft/60">{l}</p><strong className="text-2xl">{v}</strong></Card>)}
    </div>
    {sessions.length === 0 ? <Card><div className="p-10 text-center"><LayoutGrid className="mx-auto text-copper"/><p className="mt-3 font-bold">لا توجد جلسات نشطة</p></div></Card> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{sessions.map((s) => <Card key={s.id} className={`p-5 ${s.assistanceRequested ? "border-brick/40 bg-brick/5" : ""}`}><div className="flex items-start justify-between"><div><strong>طاولة {s.tableLabel}</strong><p className="mt-1 text-xs text-ink-soft/55">{s.customer_name || "زبون"}</p></div><Badge tone={s.assistanceRequested ? "danger" : "neutral"}>{s.status}</Badge></div>{s.assistanceRequested ? <div className="mt-5 flex items-center justify-between rounded-xl bg-brick/10 p-3"><span className="flex items-center gap-2 text-sm font-bold text-brick"><Bell size={16}/> تحتاج مساعدة</span><button onClick={() => resolve(s.id)} className="rounded-lg bg-paper px-3 py-2 text-xs font-bold"><Check size={14} className="inline"/> تمت</button></div> : <div className="mt-5 border-t border-ink/8 pt-3 text-xs text-ink-soft/55">لا توجد طلبات معلقة</div>}</Card>)}</div>}
  </div>;
}
