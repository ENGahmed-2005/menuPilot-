import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Pencil, RefreshCw, Search, UserRound, X } from "lucide-react";
import { api } from "../../api/client";

const input = "mt-2 w-full rounded-xl border border-ink/10 bg-paper-2 px-4 py-3 text-sm outline-none focus:border-copper";
const planLabels = { basic: "Basic", pro: "Pro", premium: "Premium", trial: "Trial" };

export default function OwnersManagement() {
  const [owners, setOwners] = useState([]);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", restaurant_name: "", restaurant_phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { setOwners(await api.get("/admin/restaurants") || []); }
    catch (e) { setError(e.message || "تعذر تحميل أصحاب المطاعم"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => owners.filter(o => `${o.name || ""} ${o.email || ""} ${o.restaurant_name || ""}`.toLowerCase().includes(query.toLowerCase())), [owners, query]);

  function openEdit(owner) {
    setSuccess(""); setError("");
    setForm({ name: owner.name || "", email: owner.email || "", restaurant_name: owner.restaurant_name || "", restaurant_phone: owner.restaurant_phone || "" });
    setModal(owner);
  }

  async function save(e) {
    e.preventDefault();
    if (!modal) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const updated = await api.patch(`/admin/owners/${modal.id}`, form);
      setOwners(current => current.map(owner => owner.id === modal.id ? { ...owner, ...updated } : owner));
      setModal(null);
      setSuccess("تم حفظ بيانات المالك والمطعم.");
    } catch (e) { setError(e.message || "تعذر حفظ التعديلات"); }
    finally { setSaving(false); }
  }

  return <div dir="rtl" className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><p className="text-sm font-bold text-copper">إدارة المنصة</p><h1 className="mt-1 text-3xl font-black">أصحاب المطاعم</h1><p className="mt-2 text-sm text-ink-soft/60">بيانات حقيقية من حسابات الملاك في قاعدة البيانات.</p></div>
      <button onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/10 px-5 py-3 text-sm font-black"><RefreshCw size={17} className={loading ? "animate-spin" : ""}/>تحديث</button>
    </div>
    {error && <div className="rounded-2xl bg-brick/10 p-4 text-sm font-bold text-brick">{error}</div>}
    {success && <div className="rounded-2xl bg-green-100 p-4 text-sm font-bold text-green-700">{success}</div>}
    <div className="relative max-w-lg rounded-2xl border border-ink/10 bg-paper p-4"><Search className="absolute right-7 top-7 text-ink-soft/40" size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث بالاسم أو البريد أو المطعم..." className="w-full rounded-xl border border-ink/10 bg-paper-2 py-3 pr-10 pl-4 outline-none focus:border-copper"/></div>
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-paper"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-right"><thead className="bg-ink/[.03] text-xs text-ink-soft/60"><tr><th className="px-6 py-4">المالك</th><th>المطعم</th><th>الهاتف</th><th>الباقة</th><th>الحالة</th><th className="px-6">إجراءات</th></tr></thead><tbody className="divide-y divide-ink/10">{filtered.map(o => { const active = o.plan === "trial" || ["basic", "pro", "premium"].includes(o.plan); return <tr key={o.id}><td className="px-6 py-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-copper/10 text-copper"><UserRound size={18}/></span><div><b>{o.name || "بدون اسم"}</b><p className="mt-1 text-xs text-ink-soft/50">{o.email}</p></div></div></td><td className="py-5 font-bold">{o.restaurant_name || "—"}</td><td className="py-5 text-sm text-ink-soft/60">{o.restaurant_phone || "—"}</td><td className="py-5"><span className="rounded-lg bg-ink/5 px-3 py-1 text-xs font-black">{planLabels[o.plan] || o.plan}</span></td><td className="py-5"><span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}><CheckCircle2 size={13}/>{active ? "نشط" : "غير نشط"}</span></td><td className="px-6"><button onClick={()=>openEdit(o)} className="inline-flex items-center gap-1 rounded-lg bg-copper/10 px-3 py-2 text-xs font-bold text-copper"><Pencil size={15}/>تعديل</button></td></tr>; })}</tbody></table></div>{loading && <div className="p-10 text-center">جارِ تحميل أصحاب المطاعم...</div>}{!loading && filtered.length === 0 && <div className="p-10 text-center text-sm text-ink-soft/60">لا توجد نتائج مطابقة.</div>}</div>
    {modal && <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/60 p-4"><form onSubmit={save} className="w-full max-w-lg rounded-3xl bg-paper p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-copper">تعديل من الباكند</p><h2 className="text-xl font-black">بيانات المالك والمطعم</h2></div><button type="button" onClick={()=>setModal(null)}><X/></button></div><div className="mt-6 space-y-4"><label className="block text-sm font-bold">اسم المالك<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className={input}/></label><label className="block text-sm font-bold">البريد الإلكتروني<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className={input}/></label><label className="block text-sm font-bold">اسم المطعم<input value={form.restaurant_name} onChange={e=>setForm({...form,restaurant_name:e.target.value})} className={input}/></label><label className="block text-sm font-bold">هاتف المطعم<input value={form.restaurant_phone} onChange={e=>setForm({...form,restaurant_phone:e.target.value})} className={input}/></label></div><div className="mt-6 flex gap-3"><button disabled={saving} className="flex-1 rounded-xl bg-copper py-3 font-black text-ink">{saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</button><button type="button" onClick={()=>setModal(null)} className="rounded-xl border border-ink/10 px-5">إلغاء</button></div></form></div>}
  </div>;
}
