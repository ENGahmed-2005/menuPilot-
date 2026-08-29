import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Clock3, DollarSign, TrendingUp, Crown } from "lucide-react";
import { getOwnerOrders } from "../../api/orders";
import { useAuth } from "../../context/AuthContext";
import { getSubscriptionPlan, hasPlanFeature } from "../../config/subscriptions";
import Card from "../../components/dashboard/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";

const statusLabels = { pending: "قيد الانتظار", preparing: "قيد التحضير", ready: "جاهز", served: "تم التقديم", cancelled: "ملغي" };
const statusTones = { pending: "warning", preparing: "warning", ready: "good", served: "good", cancelled: "danger" };

export default function SubscriptionDashboard() {
  const { user } = useAuth();
  const plan = getSubscriptionPlan(user?.plan);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getOwnerOrders().then(setOrders).finally(() => setLoading(false)); }, []);
  const stats = useMemo(() => ({ total: orders.length, open: orders.filter((o) => ["pending", "preparing"].includes(String(o.status).toLowerCase())).length, revenue: orders.reduce((s, o) => s + (Number(o.total) || 0), 0) }), [orders]);
  if (loading) return <Spinner label="جارِ تحميل لوحة التحكم…" />;
  return <div dir="rtl" className="space-y-6">
    <div className="rounded-3xl bg-ink p-6 text-paper shadow-xl sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex items-center gap-2 text-xs font-bold text-copper"><Crown size={15} /> باقة {plan.name}</div><h1 className="mt-2 text-3xl font-black">لوحة تشغيل مطعمك</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-paper/55">تابع الطلبات والإيرادات والأدوات المتاحة حسب اشتراكك.</p></div>
        <div className="rounded-2xl border border-paper/10 bg-paper/5 px-6 py-4 text-center"><strong className="text-3xl text-copper">${plan.price}</strong><div className="text-xs text-paper/45">شهريًا</div></div>
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
      {[[ClipboardList,"الطلبات",stats.total],[Clock3,"مفتوحة",stats.open],[DollarSign,"الإيرادات",stats.revenue.toFixed(2)]].map(([Icon,label,value]) => <Card key={label} className="p-5"><div className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-copper/10 text-copper"><Icon size={21}/></span><div><p className="text-xs text-ink-soft/60">{label}</p><strong className="text-2xl">{value}</strong></div></div></Card>)}
    </div>
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4"><div><h2 className="font-black">آخر الطلبات</h2><p className="mt-1 text-xs text-ink-soft/55">بيانات التشغيل الحالية</p></div><Badge tone="good">مباشر</Badge></div>
      {orders.length === 0 ? <div className="p-8 text-center text-sm text-ink-soft/60">لا توجد طلبات حتى الآن.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-right text-sm"><thead className="bg-ink/[0.03]"><tr><th className="px-5 py-3">الطلب</th><th className="px-5 py-3">الطاولة</th><th className="px-5 py-3">الحالة</th><th className="px-5 py-3">الإجمالي</th></tr></thead><tbody className="divide-y divide-ink/8">{orders.slice(0,8).map((o) => { const s=String(o.status).toLowerCase(); return <tr key={o.id} className="hover:bg-ink/[0.02]"><td className="px-5 py-3 font-bold">{o.orderNumber}</td><td className="px-5 py-3">{o.tableLabel}</td><td className="px-5 py-3"><Badge tone={statusTones[s] || "neutral"}>{statusLabels[s] || o.status}</Badge></td><td className="px-5 py-3 font-bold">{o.total}</td></tr>; })}</tbody></table></div>}
    </Card>
    <div className="grid gap-4 md:grid-cols-3">
      {[['التقارير', 'reports'], ['التحليلات', 'analytics'], ['التقارير المتقدمة', 'advanced-reports']].map(([label,feature]) => <Card key={feature} className="p-5"><p className="text-xs text-ink-soft/55">{label}</p><div className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${hasPlanFeature(user?.plan, feature) ? 'bg-herb/10 text-herb' : 'bg-ink/5 text-ink-soft/50'}`}>{hasPlanFeature(user?.plan, feature) ? 'متاح في باقتك' : 'ترقية مطلوبة'}</div></Card>)}
    </div>
  </div>;
}
