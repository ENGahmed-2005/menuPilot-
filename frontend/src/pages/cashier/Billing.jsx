import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Receipt, RefreshCw, WalletCards } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getBill, recordPayment } from "../../api/billing";
import { getSession } from "../../api/sessions";
import Spinner from "../../components/ui/Spinner";
import Card from "../../components/dashboard/Card";
import PageHeader from "../../components/dashboard/PageHeader";

const METHODS = [
  { value: "cash", label: "نقدًا" },
  { value: "electronic", label: "إلكتروني" },
  { value: "ussd", label: "USSD" },
];

const money = (value) => `${Number(value || 0).toLocaleString("ar-PS", { maximumFractionDigits: 2 })} ₪`;

export default function Billing() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [bill, setBill] = useState(null);
  const [session, setSession] = useState(null);
  const [method, setMethod] = useState("cash");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load(silent = false) {
    if (silent) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const [billData, sessionData] = await Promise.all([getBill(sessionId), getSession(sessionId)]);
      setBill(billData);
      setSession(sessionData);
    } catch (e) {
      setError(e.message || "تعذر تحميل الفاتورة.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [sessionId]);

  async function confirmPayment() {
    setSaving(true);
    setError("");
    try {
      await recordPayment(sessionId, method);
      await load(true);
    } catch (e) {
      setError(e.message || "تعذر تسجيل الدفع.");
    } finally {
      setSaving(false);
    }
  }

  const items = bill?.items || [];
  const total = useMemo(() => Number(bill?.total ?? items.reduce((sum, item) => sum + Number(item.total || 0), 0)), [bill, items]);
  const closed = session?.closed_at || bill?.status === "closed";

  if (loading) return <Spinner label="جارِ تحميل الفاتورة…" />;
  if (!bill) return <div className="p-8 text-center text-brick">{error || "الفاتورة غير موجودة."}</div>;

  return <div dir="rtl" className="mx-auto max-w-4xl pb-8">
    <PageHeader title="فاتورة الجلسة" subtitle={`جلسة #${sessionId} · ${bill.table_label || "الطاولة"} · ${bill.customer_name || session?.customer_name || "زبون"}`} action={<button onClick={() => load(true)} disabled={refreshing} className="flex items-center gap-2 rounded-xl border border-ink/10 px-3 py-2 text-sm font-bold"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""}/> تحديث</button>} />
    {error && <div className="mb-5 rounded-xl bg-brick/10 p-3 text-sm text-brick">{error}</div>}

    <div className="grid gap-5 lg:grid-cols-[1.4fr_.8fr]">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-ink/10 px-5 py-4"><Receipt size={18} className="text-copper"/><div><h2 className="font-bold">الأصناف المطلوبة</h2><p className="text-xs text-ink-soft/55">هذه البيانات قادمة من الطلب الفعلي.</p></div></div>
        <div className="divide-y divide-ink/10">
          {items.length ? items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="font-bold">{item.name}</p><p className="mt-1 text-xs text-ink-soft/55">{item.quantity} × {money(item.price ?? item.unit_price)}</p></div><strong>{money(item.total)}</strong></div>) : <div className="p-8 text-center text-sm text-ink-soft">لا توجد أصناف في هذه الجلسة.</div>}
        </div>
        <div className="border-t border-ink/10 bg-paper-2 px-5 py-5"><div className="flex items-center justify-between"><span className="font-bold">الإجمالي</span><strong className="text-2xl text-copper-deep">{money(total)}</strong></div></div>
      </Card>

      <Card className="h-fit p-5">
        <div className="flex items-center gap-3"><WalletCards size={18} className="text-copper"/><div><h2 className="font-bold">الدفع</h2><p className="text-xs text-ink-soft/55">إغلاق الجلسة بعد استلام المبلغ.</p></div></div>
        {closed ? <div className="mt-5 rounded-2xl bg-herb/10 p-4 text-sm font-bold text-herb"><CheckCircle2 className="mb-2" size={22}/>تم إغلاق الجلسة وتأكيد الدفع.</div> : <>
          <div className="mt-5 space-y-2">{METHODS.map((m) => <button key={m.value} onClick={() => setMethod(m.value)} className={`w-full rounded-xl border px-4 py-3 text-right text-sm font-bold ${method === m.value ? "border-copper bg-copper/10" : "border-ink/10"}`}>{m.label}</button>)}</div>
          <button onClick={confirmPayment} disabled={saving || !items.length} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3.5 text-sm font-bold text-paper disabled:opacity-50">{saving ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18}/>}تأكيد الدفع وإغلاق الجلسة</button>
        </>}
        <button onClick={() => navigate("/cashier/tables")} className="mt-3 w-full rounded-xl border border-ink/10 px-4 py-3 text-sm font-bold"><ArrowRight size={16} className="inline ml-2"/>العودة للطاولات</button>
      </Card>
    </div>
  </div>;
}