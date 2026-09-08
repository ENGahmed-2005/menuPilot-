import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, UserRound, X } from "lucide-react";

const initialOwners = [
  { id: 1, name: "محمد أحمد", email: "mohammed@example.com", phone: "0599123456", restaurant: "مطعم الذوق", status: "نشط" },
  { id: 2, name: "سارة خالد", email: "sara@example.com", phone: "0599456789", restaurant: "Burger House", status: "نشط" },
  { id: 3, name: "أحمد سمير", email: "ahmad@example.com", phone: "0599987654", restaurant: "Italian Corner", status: "موقوف" },
];

const empty = { name: "", email: "", phone: "", restaurant: "", status: "نشط" };
const input = "mt-2 w-full rounded-xl border border-ink/10 bg-paper-2 px-4 py-3 text-sm outline-none focus:border-copper";

export default function OwnersManagement() {
  const [owners, setOwners] = useState(initialOwners);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const filtered = useMemo(() => owners.filter(o => `${o.name} ${o.email} ${o.restaurant}`.toLowerCase().includes(query.toLowerCase())), [owners, query]);

  const openNew = () => { setForm(empty); setModal("new"); };
  const openEdit = owner => { setForm({ ...owner }); setModal(owner.id); };
  const save = e => { e.preventDefault(); if (!form.name.trim() || !form.email.trim()) return; if (modal === "new") setOwners(p => [...p, { ...form, id: Date.now() }]); else setOwners(p => p.map(o => o.id === modal ? { ...form, id: modal } : o)); setModal(null); };
  const remove = id => { if (window.confirm("هل تريد حذف حساب المالك؟")) setOwners(p => p.filter(o => o.id !== id)); };

  return <div dir="rtl" className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><p className="text-sm font-bold text-copper">إدارة المنصة</p><h1 className="mt-1 text-3xl font-black">أصحاب المطاعم</h1><p className="mt-2 text-sm text-ink-soft/60">إدارة حسابات ملاك المطاعم وربط كل حساب بمطعمه.</p></div>
      <button onClick={openNew} className="inline-flex items-center justify-center gap-2 rounded-xl bg-copper px-5 py-3 text-sm font-black text-ink"><Plus size={18}/>إضافة مالك</button>
    </div>
    <div className="relative max-w-lg rounded-2xl border border-ink/10 bg-paper p-4"><Search className="absolute right-7 top-7 text-ink-soft/40" size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث بالاسم أو البريد أو المطعم..." className="w-full rounded-xl border border-ink/10 bg-paper-2 py-3 pr-10 pl-4 outline-none focus:border-copper"/></div>
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-paper"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-right"><thead className="bg-ink/[.03] text-xs text-ink-soft/60"><tr><th className="px-6 py-4">المالك</th><th>المطعم</th><th>التواصل</th><th>الحالة</th><th className="px-6">إجراءات</th></tr></thead><tbody className="divide-y divide-ink/10">{filtered.map(o=><tr key={o.id}><td className="px-6 py-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-copper/10 text-copper"><UserRound size={18}/></span><div><b>{o.name}</b><p className="mt-1 text-xs text-ink-soft/50">{o.email}</p></div></div></td><td className="py-5 font-bold">{o.restaurant || "—"}</td><td className="py-5 text-sm text-ink-soft/60">{o.phone || "—"}</td><td className="py-5"><span className={`rounded-full px-3 py-1 text-xs font-bold ${o.status === "نشط" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{o.status}</span></td><td className="px-6"><button onClick={()=>openEdit(o)} className="p-2 text-copper"><Pencil size={18}/></button><button onClick={()=>remove(o.id)} className="p-2 text-brick"><Trash2 size={18}/></button></td></tr>)}</tbody></table></div></div>
    {modal && <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/60 p-4"><form onSubmit={save} className="w-full max-w-lg rounded-3xl bg-paper p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-black">{modal === "new" ? "إضافة صاحب مطعم" : "تعديل حساب المالك"}</h2><button type="button" onClick={()=>setModal(null)}><X/></button></div><div className="mt-6 space-y-4"><label className="block text-sm font-bold">الاسم<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className={input}/></label><label className="block text-sm font-bold">البريد الإلكتروني<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className={input}/></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">رقم الهاتف<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className={input}/></label><label className="text-sm font-bold">المطعم<input value={form.restaurant} onChange={e=>setForm({...form,restaurant:e.target.value})} className={input}/></label></div><label className="block text-sm font-bold">الحالة<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className={input}><option>نشط</option><option>موقوف</option></select></label></div><div className="mt-6 flex gap-3"><button className="flex-1 rounded-xl bg-copper py-3 font-black text-ink">حفظ</button><button type="button" onClick={()=>setModal(null)} className="rounded-xl border border-ink/10 px-5">إلغاء</button></div></form></div>}
  </div>;
}
