import { useEffect, useState } from "react";
import { UserPlus, Copy, Check, Trash2, Shield, KeyRound } from "lucide-react";
import { getStaff, createStaff, updateStaff, deleteStaff } from "../../api/staff";
import Card from "../../components/dashboard/Card";
import PageHeader from "../../components/dashboard/PageHeader";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";

const roles = [
  { value: "kitchen", label: "المطبخ" },
  { value: "waiter", label: "النادل" },
  { value: "cashier", label: "الكاشير" },
];
const labels = Object.fromEntries(roles.map((r) => [r.value, r.label]));

function makePassword() {
  return `MP-${Math.random().toString(36).slice(2, 7).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
}

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "waiter", password: "" });

  const load = () => getStaff().then(setStaff).catch(setError).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const created = await createStaff({ ...form, password: form.password || makePassword() });
      setStaff((s) => [created, ...s]);
      setForm({ name: "", email: "", role: "waiter", password: "" });
    } catch (err) { setError(err); } finally { setSaving(false); }
  }

  async function toggle(member) {
    try {
      const updated = await updateStaff(member.id, { active: !member.active });
      setStaff((s) => s.map((x) => x.id === member.id ? updated : x));
    } catch (err) { setError(err); }
  }

  async function remove(member) {
    if (!window.confirm(`حذف حساب ${member.name}؟`)) return;
    try { await deleteStaff(member.id); setStaff((s) => s.filter((x) => x.id !== member.id)); }
    catch (err) { setError(err); }
  }

  async function copyCredentials(member) {
    await navigator.clipboard?.writeText(`menuPilot\nالبريد: ${member.email}\nكلمة المرور: ${member.password}`);
    setCopied(member.id); setTimeout(() => setCopied(null), 1600);
  }

  if (loading) return <Spinner label="جارِ تحميل فريق المطعم…" />;
  return <div dir="rtl" className="space-y-6">
    <PageHeader title="فريق المطعم" subtitle="أنشئ حسابات المطبخ والنادل والكاشير من مكان واحد، وشارك بيانات الدخول بأمان." />
    {error && <p role="alert" className="rounded-xl bg-brick/10 px-4 py-3 text-sm text-brick">{error.message}</p>}
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <Card className="p-5">
        <div className="mb-5 flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-copper/10 text-copper"><UserPlus size={19}/></span><div><h2 className="font-black">إضافة حساب</h2><p className="text-xs text-ink-soft/55">صلاحيات حسب الدور</p></div></div>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="اسم الموظف" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="w-full rounded-xl border border-ink/10 bg-paper px-3 py-3 text-sm outline-none focus:border-copper" />
          <input required type="email" placeholder="البريد الإلكتروني" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} className="w-full rounded-xl border border-ink/10 bg-paper px-3 py-3 text-sm outline-none focus:border-copper" />
          <select value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})} className="w-full rounded-xl border border-ink/10 bg-paper px-3 py-3 text-sm outline-none focus:border-copper">{roles.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select>
          <div className="relative"><KeyRound size={16} className="absolute right-3 top-3.5 text-ink-soft/40"/><input placeholder="كلمة مرور (اختياري: تُنشأ تلقائيًا)" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} className="w-full rounded-xl border border-ink/10 bg-paper py-3 pr-9 pl-3 text-sm outline-none focus:border-copper" /></div>
          <Button disabled={saving} className="w-full">{saving ? "جارِ الإنشاء…" : "إنشاء الحساب"}</Button>
        </form>
      </Card>
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4"><div><h2 className="font-black">حسابات الفريق</h2><p className="text-xs text-ink-soft/55">{staff.length} حسابات مُدارة من المالك</p></div><Shield size={18} className="text-copper"/></div>
        <div className="divide-y divide-ink/8">
          {staff.length === 0 && <div className="p-8 text-center text-sm text-ink-soft/55">لم تتم إضافة موظفين بعد.</div>}
          {staff.map((m)=><div key={m.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><strong>{m.name}</strong><Badge tone={m.active ? "good" : "danger"}>{m.active ? "نشط" : "متوقف"}</Badge></div><p className="mt-1 truncate text-xs text-ink-soft/60">{m.email}</p></div>
            <Badge tone="neutral">{labels[m.role] || m.role}</Badge>
            <div className="rounded-xl bg-ink/[0.04] px-3 py-2 text-xs"><span className="text-ink-soft/50">كلمة المرور:</span> <b>{m.password}</b></div>
            <div className="flex gap-2"><button title="نسخ بيانات الدخول" onClick={()=>copyCredentials(m)} className="rounded-xl border border-ink/10 p-2 hover:border-copper">{copied===m.id?<Check size={16}/>:<Copy size={16}/>}</button><button onClick={()=>toggle(m)} className="rounded-xl border border-ink/10 px-3 text-xs font-bold">{m.active?"إيقاف":"تفعيل"}</button><button onClick={()=>remove(m)} className="rounded-xl border border-brick/20 p-2 text-brick hover:bg-brick/5"><Trash2 size={16}/></button></div>
          </div>)}
        </div>
      </Card>
    </div>
  </div>;
}
