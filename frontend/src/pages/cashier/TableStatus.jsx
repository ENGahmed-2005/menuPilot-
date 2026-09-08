import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid, Receipt, WalletCards, CircleDollarSign, CheckCircle2 } from "lucide-react";
import { getTables } from "../../api/tables";
import { getBill } from "../../api/billing";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
export default function TableStatus(){
 const [tables,setTables]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(null);
 useEffect(()=>{getTables().then(setTables).catch(setError).finally(()=>setLoading(false))},[]);
 const occupied=tables.filter(t=>t.status!=="Available"), available=tables.length-occupied.length;
 if(loading)return <Spinner label="جارِ تحميل الكاشير…"/>;
 return <div dir="rtl"><PageHeader title="مركز الكاشير" subtitle="حالة الطاولات، الفواتير والدفع من شاشة واحدة."/>{error&&<p className="mb-4 rounded-xl bg-brick/10 p-3 text-sm text-brick">{error.message}</p>}
  <div className="mb-5 grid gap-3 sm:grid-cols-3">{[[LayoutGrid,"إجمالي الطاولات",tables.length],[CheckCircle2,"متاحة",available],[WalletCards,"مشغولة",occupied.length]].map(([I,l,v])=><Card key={l} className="p-4"><I size={18} className="text-copper"/><p className="mt-2 text-xs text-ink-soft/60">{l}</p><strong className="text-2xl">{v}</strong></Card>)}</div>
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tables.map(t=><Card key={t.id} className="p-5"><div className="flex items-center justify-between"><div><strong>{t.label}</strong><p className="mt-1 text-xs text-ink-soft/55">QR: {t.code}</p></div><Badge tone={t.status==="Available"?"good":"warning"}>{t.status==="Available"?"متاحة":"مشغولة"}</Badge></div>{t.activeSessionId?<Link to={`/cashier/billing/${t.activeSessionId}`} className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-paper hover:bg-ink-soft"><Receipt size={16}/> فتح الفاتورة</Link>:<div className="mt-5 rounded-xl bg-ink/[0.04] px-4 py-3 text-center text-xs text-ink-soft/55">جاهزة لاستقبال جلسة جديدة</div>}</Card>)}</div>
 </div>;
}
