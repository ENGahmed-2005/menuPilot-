import { Link } from "react-router-dom";
import { Activity, AlertTriangle, ArrowUpLeft, BarChart3, Building2, CheckCircle2, ClipboardList, Clock3, CreditCard, DollarSign, QrCode, Users, UtensilsCrossed } from "lucide-react";
import Card from "../../components/dashboard/Card";

// Mock data for the frontend MVP. It mirrors the entities and flows defined in menuPilot SRS.
const restaurants = [
  { id: 1, name: "مطعم الذوق", owner: "محمد أحمد", plan: "Premium", status: "نشط", tables: 18, activeSessions: 6, orders: 24 },
  { id: 2, name: "Burger House", owner: "سارة خالد", plan: "Pro", status: "نشط", tables: 12, activeSessions: 4, orders: 18 },
  { id: 3, name: "Italian Corner", owner: "أحمد سمير", plan: "Basic", status: "موقوف", tables: 8, activeSessions: 0, orders: 7 },
  { id: 4, name: "Café Bloom", owner: "ليان يوسف", plan: "Pro", status: "نشط", tables: 15, activeSessions: 7, orders: 31 },
];

const recentOrders = [
  { no: "#1048", restaurant: "مطعم الذوق", table: "T-07", status: "Preparing", amount: 86, time: "منذ دقيقتين" },
  { no: "#1047", restaurant: "Café Bloom", table: "T-03", status: "Ready", amount: 42, time: "منذ 6 دقائق" },
  { no: "#1046", restaurant: "Burger House", table: "T-11", status: "Pending", amount: 57, time: "منذ 9 دقائق" },
  { no: "#1045", restaurant: "مطعم الذوق", table: "T-02", status: "Served", amount: 113, time: "منذ 14 دقيقة" },
];

const salesTrend = [38, 52, 44, 68, 59, 81, 74];
const statusLabel = { Pending: "قيد الانتظار", Preparing: "قيد التحضير", Ready: "جاهز", Served: "تم التقديم" };
const statusClass = { Pending: "bg-amber-100 text-amber-700", Preparing: "bg-blue-100 text-blue-700", Ready: "bg-green-100 text-green-700", Served: "bg-ink/10 text-ink-soft" };

function StatCard({ icon: Icon, label, value, hint }) {
  return <Card className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-ink-soft/60">{label}</p><strong className="mt-2 block text-3xl font-black">{value}</strong><p className="mt-2 text-xs text-ink-soft/50">{hint}</p></div><span className="grid h-12 w-12 place-items-center rounded-2xl bg-copper/10 text-copper"><Icon size={21}/></span></div></Card>;
}

export default function AdminDashboard() {
  const activeRestaurants = restaurants.filter(r => r.status === "نشط").length;
  const activeSessions = restaurants.reduce((sum, r) => sum + r.activeSessions, 0);
  const totalOrders = restaurants.reduce((sum, r) => sum + r.orders, 0);
  const revenue = recentOrders.reduce((sum, order) => sum + order.amount, 0) + 624;

  return <div dir="rtl" className="space-y-6">
    <header className="relative overflow-hidden rounded-3xl bg-ink p-7 text-paper sm:p-8">
      <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-copper/10 blur-3xl"/>
      <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-copper">Platform control center</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">مركز إدارة menuPilot</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-paper/60">نظرة تشغيلية موحدة على المطاعم، جلسات الطعام، الطلبات، وحركة المبيعات في المنصة.</p></div>
        <div className="flex flex-wrap gap-2"><Link to="/admin/restaurants" className="rounded-xl bg-copper px-4 py-2.5 text-sm font-black text-ink">إدارة المطاعم</Link><Link to="/admin/owners" className="rounded-xl border border-paper/15 px-4 py-2.5 text-sm font-bold text-paper hover:bg-paper/10">أصحاب المطاعم</Link></div>
      </div>
    </header>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Building2} label="المطاعم المسجلة" value={restaurants.length} hint={`${activeRestaurants} مطاعم نشطة حاليًا`}/>
      <StatCard icon={Users} label="الجلسات النشطة" value={activeSessions} hint="Dining Sessions مفتوحة"/>
      <StatCard icon={ClipboardList} label="طلبات اليوم" value={totalOrders} hint="طلبات حالية وتجريبية"/>
      <StatCard icon={DollarSign} label="المبيعات التجريبية" value={`₪${revenue}`} hint="مؤشر الإيرادات الحالي"/>
    </section>

    <section className="grid gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2 p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black">اتجاه المبيعات</h2><p className="mt-1 text-xs text-ink-soft/55">حجم الطلبات والإيرادات خلال آخر 7 أيام — متطلب FR-40.</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-copper/10 text-copper"><BarChart3 size={20}/></span></div><div className="mt-8 flex h-52 items-end justify-between gap-3">{salesTrend.map((value, index) => <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="w-full rounded-t-xl bg-copper/20 px-1 transition hover:bg-copper/40" style={{height: `${value}%`}}><div className="h-full rounded-t-xl bg-copper"/></div><span className="text-[10px] text-ink-soft/50">{["سبت","أحد","اثنين","ثلاثاء","أربعاء","خميس","جمعة"][index]}</span></div>)}</div><div className="mt-4 flex items-center gap-4 border-t border-ink/8 pt-4 text-xs text-ink-soft/60"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-copper"/>نشاط المبيعات</span><span className="flex items-center gap-2"><ArrowUpLeft size={14} className="text-green-600"/>+18% مقارنة بالفترة السابقة</span></div></Card>
      <Card className="p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black">حالة التشغيل</h2><p className="mt-1 text-xs text-ink-soft/55">متابعة التدفقات الأساسية.</p></div><Activity className="text-copper"/></div><div className="mt-6 space-y-4">{[["طلبات قيد الانتظار",5,"Pending"],["قيد التحضير",8,"Preparing"],["جاهزة للتقديم",4,"Ready"],["طلبات مكتملة",21,"Served"]].map(([label,value,status])=><div key={status}><div className="mb-2 flex justify-between text-sm"><span>{label}</span><b>{value}</b></div><div className="h-2 overflow-hidden rounded-full bg-ink/7"><div className={`h-full rounded-full ${status === "Ready" ? "bg-green-500" : status === "Preparing" ? "bg-blue-500" : status === "Pending" ? "bg-amber-500" : "bg-ink/40"}`} style={{width:`${Math.min(100, Number(value)*4)}%`}}/></div></div>)}</div></Card>
    </section>

    <section className="grid gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2 overflow-hidden"><div className="flex items-center justify-between border-b border-ink/10 px-5 py-5"><div><h2 className="font-black">أحدث الطلبات</h2><p className="mt-1 text-xs text-ink-soft/55">عرض تشغيلي للطلبات الحالية والسابقة وفق FR-21.</p></div><ClipboardList className="text-copper" size={20}/></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-right text-sm"><thead className="bg-ink/[.03] text-xs text-ink-soft/60"><tr><th className="px-5 py-3">الطلب</th><th>المطعم</th><th>الطاولة</th><th>الحالة</th><th>القيمة</th><th className="px-5">الوقت</th></tr></thead><tbody className="divide-y divide-ink/8">{recentOrders.map(order=><tr key={order.no}><td className="px-5 py-4 font-black">{order.no}</td><td className="py-4">{order.restaurant}</td><td className="py-4">{order.table}</td><td className="py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass[order.status]}`}>{statusLabel[order.status]}</span></td><td className="py-4 font-bold">₪{order.amount}</td><td className="px-5 py-4 text-xs text-ink-soft/55">{order.time}</td></tr>)}</tbody></table></div></Card>
      <Card className="p-5"><h2 className="font-black">تنبيهات المنصة</h2><div className="mt-5 space-y-3"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex gap-3"><AlertTriangle className="shrink-0 text-amber-600" size={19}/><div><b className="text-sm">مطعم يحتاج متابعة</b><p className="mt-1 text-xs leading-5 text-ink-soft/65">Italian Corner موقوف حاليًا ولا توجد جلسات نشطة.</p></div></div></div><div className="rounded-2xl border border-green-200 bg-green-50 p-4"><div className="flex gap-3"><CheckCircle2 className="shrink-0 text-green-600" size={19}/><div><b className="text-sm">تدفق الطلبات طبيعي</b><p className="mt-1 text-xs leading-5 text-ink-soft/65">لا توجد طلبات تجريبية تجاوزت وقت التحضير المتوقع.</p></div></div></div></div></Card>
    </section>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Link to="/admin/restaurants" className="group rounded-2xl border border-ink/10 bg-paper p-5 transition hover:-translate-y-1 hover:border-copper/40"><Building2 className="text-copper"/><h3 className="mt-4 font-black">إدارة المطاعم</h3><p className="mt-2 text-xs leading-6 text-ink-soft/55">إضافة وتعديل وحالة المطاعم.</p></Link>
      <Link to="/admin/owners" className="group rounded-2xl border border-ink/10 bg-paper p-5 transition hover:-translate-y-1 hover:border-copper/40"><Users className="text-copper"/><h3 className="mt-4 font-black">أصحاب المطاعم</h3><p className="mt-2 text-xs leading-6 text-ink-soft/55">إدارة حسابات الملاك وربطها بالمطاعم.</p></Link>
      <div className="rounded-2xl border border-ink/10 bg-paper p-5"><QrCode className="text-copper"/><h3 className="mt-4 font-black">الجلسات والطاولات</h3><p className="mt-2 text-xs leading-6 text-ink-soft/55">متابعة QR والجلسات النشطة وحالة الطاولات.</p></div>
      <div className="rounded-2xl border border-ink/10 bg-paper p-5"><CreditCard className="text-copper"/><h3 className="mt-4 font-black">المدفوعات</h3><p className="mt-2 text-xs leading-6 text-ink-soft/55">عرض المدفوعات وطرق الدفع وسجل الإغلاق.</p></div>
    </section>

    <section className="grid gap-4 lg:grid-cols-3"><Card className="p-5"><div className="flex items-center gap-3"><Clock3 className="text-copper"/><div><h3 className="font-black">الجلسات النشطة</h3><p className="text-xs text-ink-soft/55">من QR إلى إغلاق الجلسة.</p></div></div><b className="mt-5 block text-3xl">{activeSessions}</b></Card><Card className="p-5"><div className="flex items-center gap-3"><UtensilsCrossed className="text-copper"/><div><h3 className="font-black">المطابخ النشطة</h3><p className="text-xs text-ink-soft/55">استقبال الطلبات وتحديث الحالة.</p></div></div><b className="mt-5 block text-3xl">{activeRestaurants}</b></Card><Card className="p-5"><div className="flex items-center gap-3"><Activity className="text-copper"/><div><h3 className="font-black">حالة المنصة</h3><p className="text-xs text-ink-soft/55">واجهة تجريبية للمراقبة التشغيلية.</p></div></div><b className="mt-5 block text-3xl text-green-600">Online</b></Card></section>
  </div>;
}
