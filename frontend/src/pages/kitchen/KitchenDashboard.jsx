import { useEffect, useMemo, useState } from "react";
import { ChefHat, Clock3, CheckCircle2, Flame, Filter } from "lucide-react";
import { getKitchenOrders, updateOrderStatus } from "../../api/orders";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";
import Badge from "../../components/ui/Badge";

const flow=["Pending","Preparing","Ready","Served"], ar={Pending:"قيد الانتظار",Preparing:"قيد التحضير",Ready:"جاهز",Served:"تم التقديم"},tone={Pending:"warning",Preparing:"warning",Ready:"good",Served:"neutral"};
const mins=t=>Math.max(0,Math.floor((Date.now()-new Date(t).getTime())/60000));
export default function KitchenDashboard(){
 const [orders,setOrders]=useState([]),[filter,setFilter]=useState("all"),[error,setError]=useState(null),[loading,setLoading]=useState(true);
 useEffect(()=>{let stop=false;const load=()=>getKitchenOrders({sortBy:"prepTime"}).then(x=>!stop&&setOrders(x||[])).catch(e=>!stop&&setError(e)).finally(()=>!stop&&setLoading(false));load();const id=setInterval(load,4000);return()=>{stop=true;clearInterval(id)}},[]);
 const counts=useMemo(()=>({all:orders.length,pending:orders.filter(o=>o.status==="Pending").length,preparing:orders.filter(o=>o.status==="Preparing").length,ready:orders.filter(o=>o.status==="Ready").length}),[orders]);
 async function advance(o){try{const next=flow[Math.min(flow.indexOf(o.status)+1,3)];await updateOrderStatus(o.id,next);setOrders(x=>x.map(a=>a.id===o.id?{...a,status:next}:a));}catch(e){setError(e)}}
 const shown=filter==="all"?orders:orders.filter(o=>o.status.toLowerCase()===filter);
 return <div dir="rtl"><PageHeader title="مطبخ حي" subtitle="شاشة KDS لمتابعة الطلبات، الأولوية ووقت التحضير دون تحديث يدوي."/>{error&&<p className="mb-4 rounded-xl bg-brick/10 p-3 text-sm text-brick">{error.message}</p>}
  <div className="mb-5 grid gap-3 sm:grid-cols-4">{[["all","كل الطلبات",counts.all,ChefHat],["pending","جديدة",counts.pending,Flame],["preparing","قيد التحضير",counts.preparing,Clock3],["ready","جاهزة",counts.ready,CheckCircle2]].map(([k,l,v,I])=><button key={k} onClick={()=>setFilter(k)} className={`rounded-2xl border p-4 text-right transition ${filter===k?"border-copper bg-copper/10":"border-ink/10 bg-paper"}`}><div className="flex items-center justify-between"><I size={18} className="text-copper"/><strong className="text-2xl">{v}</strong></div><span className="mt-2 block text-xs text-ink-soft/60">{l}</span></button>)}</div>
  {loading?<div className="p-8 text-center">جارِ التحميل…</div>:shown.length===0?<Card><EmptyState icon={ChefHat} title="لا توجد طلبات" description="ستظهر الطلبات هنا فور وصولها."/></Card>:<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{shown.map(o=>{const elapsed=mins(o.submittedAt),late=elapsed>o.avgPrepTimeMinutes;return <Card key={o.id} className={`flex flex-col gap-3 p-5 ${late?"border-brick/40 bg-brick/5":""}`}><div className="flex justify-between gap-2"><div><strong>#{o.orderNumber}</strong><p className="mt-1 text-xs text-ink-soft/55">طاولة {o.tableLabel}</p></div><Badge tone={tone[o.status]}>{ar[o.status]}</Badge></div><div className={`flex items-center gap-2 text-sm ${late?"font-bold text-brick":"text-ink-soft"}`}><Clock3 size={15}/> {elapsed} دقيقة {late&&"• متأخر"}</div><ul className="space-y-1 border-t border-ink/8 pt-3 text-sm">{o.items.map((i,n)=><li key={n}><b>{i.quantity}×</b> {i.name}{i.note&&<span className="text-ink-soft"> • {i.note}</span>}</li>)}</ul>{o.status!=="Served"&&<button onClick={()=>advance(o)} className="mt-auto rounded-xl bg-ink px-4 py-3 text-sm font-bold text-paper hover:bg-ink-soft">{ar[flow[Math.min(flow.indexOf(o.status)+1,3)]]}</button>}</Card>})}</div>}
 </div>;
}
