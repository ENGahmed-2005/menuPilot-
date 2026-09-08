import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Clock3, DollarSign, TrendingUp, Users, Utensils, Table2, Settings2, Crown, ArrowUpLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { getOwnerOrders } from "../../api/orders";
import { useAuth } from "../../context/AuthContext";
import { getSubscriptionPlan, hasPlanFeature } from "../../config/subscriptions";
import Card from "../../components/dashboard/Card";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";

const labels={pending:"قيد الانتظار",preparing:"قيد التحضير",ready:"جاهز",served:"تم التقديم",cancelled:"ملغي"};
const tones={pending:"warning",preparing:"warning",ready:"good",served:"good",cancelled:"danger"};
const quick=[
 ["/owner/tables","إدارة الطاولات","QR والحالة والجلسات",Table2],
 ["/owner/menu","إدارة القائمة","الأصناف والأسعار والتصنيفات",Utensils],
 ["/owner/staff","فريق المطعم","حسابات المطبخ والنادل والكاشير",Users],
 ["/owner/reports","التقارير","المبيعات والأداء",TrendingUp],
];
export default function SubscriptionDashboard(){
 const {user}=useAuth(); const plan=getSubscriptionPlan(user?.plan); const [orders,setOrders]=useState([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{getOwnerOrders().then(setOrders).finally(()=>setLoading(false));},[]);
 const stats=useMemo(()=>({total:orders.length,open:orders.filter(o=>["pending","preparing"].includes(String(o.status).toLowerCase())).length,revenue:orders.reduce((s,o)=>s+(Number(o.total)||0),0),served:orders.filter(o=>String(o.status).toLowerCase()==="served").length}),[orders]);
 if(loading)return <Spinner label="جارِ تحميل لوحة التحكم…"/>;
 return <div dir="rtl" className="space-y-6">
  <header className="rounded-3xl bg-ink p-6 text-paper shadow-xl sm:p-8"><div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold text-copper"><Crown size={15}/> {plan.name}</div><h1 className="mt-2 text-3xl font-black">مرحبًا، {user?.name||"صاحب المطعم"}</h1><p className="mt-2 text-sm leading-7 text-paper/55">مركز قيادة مطعمك: الطلبات، الفريق، القائمة، الطاولات والإيرادات.</p></div><div className="rounded-2xl border border-paper/10 bg-paper/5 px-5 py-4"><div className="text-xs text-paper/45">الاشتراك</div><strong className="text-2xl text-copper">${plan.price}<span className="text-xs text-paper/45"> / شهر</span></strong></div></div></header>
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
   {[[ClipboardList,"إجمالي الطلبات",stats.total],[Clock3,"طلبات مفتوحة",stats.open],[DollarSign,"الإيرادات",stats.revenue.toFixed(2)],[TrendingUp,"طلبات مكتملة",stats.served]].map(([I,l,v])=><Card key={l} className="p-5"><div className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-copper/10 text-copper"><I size={20}/></span><div><p className="text-xs text-ink-soft/60">{l}</p><strong className="text-2xl">{v}</strong></div></div></Card>)}
  </div>
  <section><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black">التشغيل السريع</h2><Badge tone="good">النظام يعمل</Badge></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{quick.map(([to,title,desc,I])=><Link key={to} to={to} className="group"><Card className="h-full p-5 transition hover:-translate-y-1 hover:border-copper/40"><span className="grid h-10 w-10 place-items-center rounded-xl bg-copper/10 text-copper"><I size={18}/></span><h3 className="mt-4 font-black">{title}</h3><p className="mt-1 text-xs text-ink-soft/55">{desc}</p><span className="mt-4 flex items-center gap-1 text-xs font-bold text-copper">فتح <ArrowUpLeft size={14}/></span></Card></Link>)}</div></section>
  <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]"><Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-ink/10 px-5 py-4"><div><h2 className="font-black">آخر الطلبات</h2><p className="mt-1 text-xs text-ink-soft/55">آخر حركة تشغيلية</p></div><Link to="/owner/reports" className="text-xs font-bold text-copper">عرض التقارير</Link></div><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-right text-sm"><thead className="bg-ink/[0.03]"><tr><th className="px-5 py-3">الطلب</th><th className="px-5 py-3">الطاولة</th><th className="px-5 py-3">الحالة</th><th className="px-5 py-3">الإجمالي</th></tr></thead><tbody className="divide-y divide-ink/8">{orders.slice(0,8).map(o=>{const s=String(o.status).toLowerCase();return <tr key={o.id}><td className="px-5 py-3 font-bold">{o.orderNumber}</td><td className="px-5 py-3">{o.tableLabel}</td><td className="px-5 py-3"><Badge tone={tones[s]||"neutral"}>{labels[s]||o.status}</Badge></td><td className="px-5 py-3 font-bold">{o.total}</td></tr>})}</tbody></table></div></Card>
  <Card className="p-5"><div className="flex items-center gap-2"><Settings2 size={18} className="text-copper"/><h2 className="font-black">مزايا باقتك</h2></div>{["reports","analytics","advanced-reports","custom-theme"].map(f=><div key={f} className="mt-4 flex items-center justify-between text-sm"><span>{f==="reports"?"التقارير":f==="analytics"?"التحليلات":f==="advanced-reports"?"التقارير المتقدمة":"الثيم المخصص"}</span><Badge tone={hasPlanFeature(user?.plan,f)?"good":"neutral"}>{hasPlanFeature(user?.plan,f)?"متاح":"ترقية"}</Badge></div>)}</Card></div>
 </div>;
}
