import { useMemo, useState } from "react";
import { Activity, ArrowUpLeft, ClipboardList, Clock3, DollarSign, QrCode, Table2, TrendingUp, Users, Utensils, Crown, CircleDollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getSubscriptionPlan } from "../../config/subscriptions";
import Card from "../../components/dashboard/Card";
import Badge from "../../components/ui/Badge";

// Frontend MVP mock data — designed around the restaurant-owner flows in the SRS.
const orders=[
 {id:1,orderNumber:"#1048",tableLabel:"T-07",status:"preparing",total:86,items:3,time:"منذ دقيقتين"},
 {id:2,orderNumber:"#1047",tableLabel:"T-03",status:"ready",total:42,items:2,time:"منذ 6 دقائق"},
 {id:3,orderNumber:"#1046",tableLabel:"T-11",status:"pending",total:57,items:4,time:"منذ 9 دقائق"},
 {id:4,orderNumber:"#1045",tableLabel:"T-02",status:"served",total:113,items:5,time:"منذ 14 دقيقة"},
 {id:5,orderNumber:"#1044",tableLabel:"T-05",status:"served",total:68,items:3,time:"منذ 22 دقيقة"},
];
const labels={pending:"قيد الانتظار",preparing:"قيد التحضير",ready:"جاهز",served:"تم التقديم"};
const tones={pending:"warning",preparing:"warning",ready:"good",served:"good"};
const sales=[42,58,49,73,65,84,76];
const quick=[
 ["/owner/menu","إدارة القائمة","الأصناف والتصنيفات والأسعار",Utensils],
 ["/owner/tables","الطاولات وQR","حالة الطاولات والجلسات",Table2],
 ["/owner/staff","فريق المطعم","المطبخ والكاشير والنادل",Users],
 ["/owner/reports","التقارير","المبيعات والأداء",TrendingUp],
];
function Metric({icon:Icon,label,value,detail}){return <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-ink-soft/55">{label}</p><strong className="mt-2 block text-3xl font-black">{value}</strong><p className="mt-2 text-xs text-ink-soft/45">{detail}</p></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-copper/10 text-copper"><Icon size={20}/></span></div></Card>}

export default function SubscriptionDashboard(){
 const {user}=useAuth(); const plan=getSubscriptionPlan(user?.plan||"pro"); const [period,setPeriod]=useState("اليوم");
 const stats=useMemo(()=>({
   total:orders.length+19,
   active:orders.filter(o=>["pending","preparing","ready"].includes(o.status)).length,
   revenue:1260,
   sessions:8,
   occupied:6,
   tables:18,
 }),[]);
 return <div dir="rtl" className="space-y-6">
  <header className="relative overflow-hidden rounded-3xl bg-ink p-6 text-paper shadow-xl sm:p-8"><div className="absolute -left-8 -top-10 h-48 w-48 rounded-full bg-copper/10 blur-3xl"/><div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold text-copper"><Crown size={15}/>{plan.name}</div><h1 className="mt-3 text-3xl font-black">مرحبًا، {user?.name||"صاحب المطعم"} 👋</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-paper/55">هذه هي الصورة التشغيلية لمطعمك اليوم: الطلبات، الجلسات، الطاولات والمبيعات.</p></div><div className="flex gap-2"><Link to="/owner/menu" className="rounded-xl bg-copper px-4 py-2.5 text-sm font-black text-ink">إدارة المنيو</Link><Link to="/owner/tables" className="rounded-xl border border-paper/15 px-4 py-2.5 text-sm font-bold">الطاولات</Link></div></div></header>

  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={ClipboardList} label="طلبات اليوم" value={stats.total} detail="إجمالي الطلبات المسجلة"/><Metric icon={Activity} label="الطلبات النشطة" value={stats.active} detail="قيد الانتظار والتحضير"/><Metric icon={DollarSign} label="مبيعات اليوم" value={`₪${stats.revenue}`} detail="إيرادات تجريبية"/><Metric icon={Users} label="الجلسات النشطة" value={stats.sessions} detail="عملاء داخل المطعم الآن"/></section>

  <section className="grid gap-6 xl:grid-cols-3"><Card className="xl:col-span-2 p-5 sm:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-black">أداء المبيعات</h2><p className="mt-1 text-xs text-ink-soft/55">ملخص المبيعات حسب الفترة المحددة.</p></div><div className="flex gap-1 rounded-xl bg-ink/5 p-1">{["اليوم","أسبوع","شهر"].map(p=><button key={p} onClick={()=>setPeriod(p)} className={`rounded-lg px-3 py-2 text-xs font-bold ${period===p?"bg-paper shadow text-ink":"text-ink-soft/55"}`}>{p}</button>)}</div></div><div className="mt-7 flex h-52 items-end justify-between gap-3">{sales.map((v,i)=><div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="w-full rounded-t-xl bg-copper/15" style={{height:`${v}%`}}><div className="h-full rounded-t-xl bg-copper"/></div><span className="text-[10px] text-ink-soft/45">{["سبت","أحد","اثنين","ثلاثاء","أربعاء","خميس","جمعة"][i]}</span></div>)}</div><div className="mt-4 flex items-center gap-2 border-t border-ink/8 pt-4 text-xs text-green-600"><ArrowUpLeft size={15}/> ارتفاع 18% مقارنة بالفترة السابقة</div></Card>
  <Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-black">حالة المطعم</h2><p className="mt-1 text-xs text-ink-soft/55">الطاولات والجلسات الحالية.</p></div><Table2 className="text-copper"/></div><div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-copper/10 p-4"><p className="text-xs text-ink-soft/55">مشغولة</p><b className="mt-2 block text-2xl">{stats.occupied}</b></div><div className="rounded-2xl bg-ink/5 p-4"><p className="text-xs text-ink-soft/55">متاحة</p><b className="mt-2 block text-2xl">{stats.tables-stats.occupied}</b></div></div><Link to="/owner/tables" className="mt-5 flex items-center justify-between rounded-xl border border-ink/10 px-4 py-3 text-sm font-bold">إدارة الطاولات <ArrowUpLeft size={17} className="text-copper"/></Link></Card></section>

  <section className="grid gap-6 xl:grid-cols-3"><Card className="xl:col-span-2 overflow-hidden"><div className="flex items-center justify-between border-b border-ink/10 px-5 py-4"><div><h2 className="font-black">الطلبات الحالية</h2><p className="mt-1 text-xs text-ink-soft/55">متابعة دورة الطلب من الاستلام حتى التقديم.</p></div><Badge tone="good">{stats.active} نشطة</Badge></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-right text-sm"><thead className="bg-ink/[.03] text-xs text-ink-soft/55"><tr><th className="px-5 py-3">الطلب</th><th>الطاولة</th><th>الأصناف</th><th>الحالة</th><th>القيمة</th><th className="px-5">الوقت</th></tr></thead><tbody className="divide-y divide-ink/8">{orders.map(o=><tr key={o.id}><td className="px-5 py-4 font-black">{o.orderNumber}</td><td className="py-4">{o.tableLabel}</td><td className="py-4">{o.items} أصناف</td><td className="py-4"><Badge tone={tones[o.status]}>{labels[o.status]}</Badge></td><td className="py-4 font-bold">₪{o.total}</td><td className="px-5 py-4 text-xs text-ink-soft/50">{o.time}</td></tr>)}</tbody></table></div></Card>
  <Card className="p-5"><div className="flex items-center gap-2"><Clock3 className="text-copper" size={19}/><h2 className="font-black">ملخص التشغيل</h2></div><div className="mt-5 space-y-4">{[["قيد الانتظار",orders.filter(o=>o.status==="pending").length,"bg-amber-500"],["قيد التحضير",orders.filter(o=>o.status==="preparing").length,"bg-blue-500"],["جاهز للتقديم",orders.filter(o=>o.status==="ready").length,"bg-green-500"],["تم التقديم",orders.filter(o=>o.status==="served").length,"bg-ink/40"]].map(([l,v,c])=><div key={l}><div className="mb-2 flex justify-between text-sm"><span>{l}</span><b>{v}</b></div><div className="h-2 overflow-hidden rounded-full bg-ink/7"><div className={`h-full rounded-full ${c}`} style={{width:`${Math.max(8,Number(v)*25)}%`}}/></div></div>)}</div></Card></section>

  <section><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-black">إدارة المطعم</h2><p className="mt-1 text-xs text-ink-soft/55">الوصول السريع إلى أهم مهام صاحب المطعم.</p></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{quick.map(([to,title,desc,I])=><Link key={to} to={to}><Card className="h-full p-5 transition hover:-translate-y-1 hover:border-copper/40"><span className="grid h-10 w-10 place-items-center rounded-xl bg-copper/10 text-copper"><I size={19}/></span><h3 className="mt-4 font-black">{title}</h3><p className="mt-1 text-xs leading-6 text-ink-soft/55">{desc}</p><span className="mt-4 flex items-center gap-1 text-xs font-bold text-copper">فتح الصفحة <ArrowUpLeft size={14}/></span></Card></Link>)}</div></section>

  <section className="grid gap-4 md:grid-cols-3"><Card className="p-5"><QrCode className="text-copper"/><h3 className="mt-4 font-black">QR للطاولات</h3><p className="mt-2 text-xs leading-6 text-ink-soft/55">كل طاولة مرتبطة بمسار طلب وجلسة مستقلة.</p><Link to="/owner/tables" className="mt-4 inline-block text-xs font-bold text-copper">إدارة QR</Link></Card><Card className="p-5"><CircleDollarSign className="text-copper"/><h3 className="mt-4 font-black">الفواتير والمدفوعات</h3><p className="mt-2 text-xs leading-6 text-ink-soft/55">متابعة إغلاق الجلسات وحالة المدفوعات.</p><span className="mt-4 inline-block text-xs text-ink-soft/45">واجهة الكاشير مرتبطة بتدفق المطعم</span></Card><Card className="p-5"><TrendingUp className="text-copper"/><h3 className="mt-4 font-black">تقارير الأداء</h3><p className="mt-2 text-xs leading-6 text-ink-soft/55">المبيعات والطلبات والأصناف الأكثر طلبًا.</p><Link to="/owner/reports" className="mt-4 inline-block text-xs font-bold text-copper">عرض التقارير</Link></Card></section>
 </div>;
}
