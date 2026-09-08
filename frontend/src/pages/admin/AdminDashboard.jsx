import { useEffect, useMemo, useState } from "react";
import { Building2, Crown, ShieldCheck, Wallet, Search, Activity, Users, BarChart3 } from "lucide-react";
import { getAllRestaurants, overrideRestaurantPlan } from "../../api/admin";
import { getSubscriptionPlan, SUBSCRIPTION_PLANS } from "../../config/subscriptions";
import Spinner from "../../components/ui/Spinner";
import Card from "../../components/dashboard/Card";
import Badge from "../../components/ui/Badge";

const tone={basic:"neutral",pro:"warning",premium:"good"};
export default function AdminDashboard(){
 const [restaurants,setRestaurants]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(null),[search,setSearch]=useState(""),[saving,setSaving]=useState(null);
 useEffect(()=>{getAllRestaurants().then(setRestaurants).catch(setError).finally(()=>setLoading(false));},[]);
 const filtered=restaurants.filter(r=>`${r.restaurantName} ${r.email}`.toLowerCase().includes(search.toLowerCase()));
 const mrr=restaurants.reduce((s,r)=>s+getSubscriptionPlan(r.plan).price,0); const premium=restaurants.filter(r=>r.plan==="premium").length;
 async function change(r,plan){if(plan===r.plan)return;setSaving(r.id);try{await overrideRestaurantPlan(r.id,plan);setRestaurants(x=>x.map(a=>a.id===r.id?{...a,plan}:a));}catch(e){setError(e)}finally{setSaving(null)}}
 if(loading)return <Spinner label="جارِ تحميل بيانات المنصة…"/>;
 return <div dir="rtl" className="space-y-6">
  <header className="rounded-3xl bg-ink p-7 text-paper"><div className="flex items-center gap-2 text-xs font-bold text-copper"><ShieldCheck size={16}/> مسؤول المنصة</div><h1 className="mt-2 text-3xl font-black">مركز إدارة menuPilot</h1><p className="mt-2 text-sm text-paper/55">مراقبة المطاعم، الاشتراكات وصحة المنصة من لوحة واحدة.</p></header>
  {error&&<p role="alert" className="rounded-xl bg-brick/10 px-4 py-3 text-sm text-brick">{error.message}</p>}
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[[Building2,"المطاعم",restaurants.length],[Wallet,"MRR تقديري",`$${mrr}`],[Crown,"Premium",premium],[Activity,"الحالة","Online"]].map(([I,l,v])=><Card key={l} className="p-5"><div className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-copper/10 text-copper"><I size={20}/></span><div><p className="text-xs text-ink-soft/60">{l}</p><strong className="text-2xl">{v}</strong></div></div></Card>)}</div>
  <div className="grid gap-4 md:grid-cols-3"><Card className="p-5"><BarChart3 className="text-copper"/><h3 className="mt-3 font-black">نمو الاشتراكات</h3><p className="mt-1 text-xs text-ink-soft/55">راقب انتقال المطاعم بين Basic وPro وPremium.</p></Card><Card className="p-5"><Users className="text-copper"/><h3 className="mt-3 font-black">المستأجرون</h3><p className="mt-1 text-xs text-ink-soft/55">كل مطعم معزول منطقيًا عن الآخر عند ربط Laravel.</p></Card><Card className="p-5"><Activity className="text-copper"/><h3 className="mt-3 font-black">صحة الخدمة</h3><p className="mt-1 text-xs text-ink-soft/55">واجهة المراقبة جاهزة لإضافة uptime وalerts لاحقًا.</p></Card></div>
  <Card className="overflow-hidden"><div className="flex flex-col gap-3 border-b border-ink/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black">إدارة المطاعم والاشتراكات</h2><p className="mt-1 text-xs text-ink-soft/55">تغيير الباقة هنا Override إداري للدعم، وليس تدفق دفع.</p></div><div className="relative"><Search size={15} className="absolute right-3 top-3 text-ink-soft/40"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث عن مطعم…" className="rounded-xl border border-ink/10 py-2.5 pr-9 pl-3 text-sm outline-none focus:border-copper"/></div></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-right text-sm"><thead className="bg-ink/[0.03]"><tr><th className="px-5 py-3">المطعم</th><th className="px-5 py-3">البريد</th><th className="px-5 py-3">الباقة</th><th className="px-5 py-3">تغيير</th></tr></thead><tbody className="divide-y divide-ink/8">{filtered.map(r=><tr key={r.id}><td className="px-5 py-4 font-bold">{r.restaurantName}</td><td className="px-5 py-4 text-ink-soft">{r.email}</td><td className="px-5 py-4"><Badge tone={tone[r.plan]||"neutral"}>{getSubscriptionPlan(r.plan).name}</Badge></td><td className="px-5 py-4"><select disabled={saving===r.id} value={r.plan} onChange={e=>change(r,e.target.value)} className="rounded-lg border border-ink/10 px-3 py-2 text-xs">{Object.values(SUBSCRIPTION_PLANS).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></td></tr>)}</tbody></table></div></Card>
 </div>;
}
