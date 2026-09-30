import { useEffect, useState } from "react";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { UserPlus, Copy, Check, Trash2, Shield, KeyRound, Eye, EyeOff } from "lucide-react";
import { getStaff, createStaff, updateStaff, deleteStaff } from "../../api/staff";
import Card from "../../components/dashboard/Card";
import PageHeader from "../../components/dashboard/PageHeader";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Alert from "../../components/ui/Alert";
import { errorText } from "../../utils/errors";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Toast";
import { usePermissions } from "../../hooks/usePermissions";
import { PERMISSION_GROUPS, PERMISSION_LABELS, ROLE_DEFAULTS } from "../../config/permissions";

const dateLabel = (iso) => (iso ? new Date(iso).toLocaleDateString("ar-PS-u-nu-latn", { day: "numeric", month: "short", year: "numeric" }) : "—");
const activityLabel = (iso) => {
  if (!iso) return "لم يسجّل الدخول بعد";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 10) return "نشط الآن";
  if (m < 60) return `آخر نشاط منذ ${m} د`;
  if (m < 1440) return `آخر نشاط منذ ${Math.floor(m / 60)} س`;
  return `آخر نشاط ${dateLabel(iso)}`;
};

const roles = [
  { value: "kitchen", label: "المطبخ" },
  { value: "waiter", label: "النادل" },
  { value: "cashier", label: "الكاشير" },
  { value: "delivery", label: "سائق توصيل" },
  { value: "delivery_manager", label: "مسؤول التوصيل" },
  { value: "manager", label: "مدير" },
];
const labels = Object.fromEntries(roles.map((r) => [r.value, r.label]));

export default function StaffManagement() {
  const [confirm, confirmDialog] = useConfirm();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [showPassword, setShowPassword] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "waiter", password: "" });
  const [editing, setEditing] = useState(null); // { member, perms: string[], saving, error }
  const toast = useToast();
  const { can } = usePermissions();

  function openPermissions(member) {
    setEditing({ member, perms: member.permissions || ROLE_DEFAULTS[member.role] || [], saving: false, error: null });
  }
  function togglePerm(p) {
    setEditing((e) => ({ ...e, perms: e.perms.includes(p) ? e.perms.filter((x) => x !== p) : [...e.perms, p] }));
  }
  async function savePermissions(resetToDefaults = false) {
    setEditing((e) => ({ ...e, saving: true, error: null }));
    try {
      const updated = await updateStaff(editing.member.id, { permissions: resetToDefaults ? null : editing.perms });
      setStaff((list) => list.map((x) => (x.id === updated.id ? updated : x)));
      setEditing(null);
      toast.success(`حُفظت صلاحيات ${updated.name}. سيُطلب منه تسجيل الدخول من جديد.`);
    } catch (err) {
      setEditing((e) => ({ ...e, saving: false, error: err }));
    }
  }

  const load = () => getStaff().then(setStaff).catch(setError).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await createStaff(form);
      setStaff((s) => [result.staff, ...s]);
      setCredentials({ ...result.staff, password: result.generated_password });
      setShowPassword(true);
      setForm({ name: "", email: "", phone: "", role: "waiter", password: "" });
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(member) {
    if (member.active) {
      const ok = await confirm({
        title: `إيقاف حساب ${member.name}؟`,
        description: "لن يستطيع تسجيل الدخول أو استخدام النظام حتى تعيد تفعيله. يبقى سجلّه كما هو.",
        confirmLabel: "إيقاف الحساب",
        tone: "danger",
      });
      if (!ok) return;
    }
    try {
      const updated = await updateStaff(member.id, { active: !member.active });
      setStaff((s) => s.map((x) => x.id === member.id ? updated : x));
      toast.success(updated.active ? `أُعيد تفعيل حساب ${updated.name}.` : `أُوقف حساب ${updated.name}.`);
    } catch (err) {
      setError(err);
    }
  }

  async function remove(member) {
    const ok = await confirm({
      title: `حذف حساب ${member.name}؟`,
      description: "لن يتمكن هذا الموظف من تسجيل الدخول بعد الآن. لا يمكن التراجع عن الحذف.",
      confirmLabel: "حذف الحساب",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteStaff(member.id);
      setStaff((s) => s.filter((x) => x.id !== member.id));
      if (credentials?.email === member.email) setCredentials(null);
    } catch (err) {
      setError(err);
    }
  }

  async function copyCredentials() {
    if (!credentials) return;
    await navigator.clipboard?.writeText(`menuPilot\nالبريد: ${credentials.email}\nكلمة المرور: ${credentials.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (loading) return <Spinner label="جارِ تحميل فريق المطعم…" />;

  return (
    <div dir="rtl" className="space-y-6">
      {confirmDialog}
      <PageHeader title="الفريق والصلاحيات" subtitle="أنشئ حسابات الموظفين، وحدّد دور كل منهم وما يستطيع فعله. إيقاف الحساب يمنع الدخول فورًا دون حذف سجله." />
      {error && <Alert tone="danger" onDismiss={() => setError(null)}>{errorText(error, "تعذّر حفظ التغيير.")}</Alert>}

      {credentials && (
        <Card className="border border-copper/30 bg-copper/5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-black">تم إنشاء حساب {credentials.name}</h2>
              <p className="mt-1 text-xs text-muted">احفظ بيانات الدخول الآن، لأن كلمة المرور لا تُعرض مرة أخرى.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-xl bg-paper px-3 py-2">{credentials.email}</span>
              <span className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2 font-mono">
                {showPassword ? credentials.password : "••••••••••"}
                <button type="button" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </span>
              <button type="button" onClick={copyCredentials} className="rounded-xl border border-ink/10 bg-paper p-2 hover:border-copper" title="نسخ بيانات الدخول">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card className="p-5">
          <div className="mb-5 flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-xl bg-copper/10 text-copper"><UserPlus size={19}/></span><div><h2 className="font-black">إضافة حساب</h2><p className="text-xs text-muted">الحساب يستطيع تسجيل الدخول مباشرة</p></div></div>
          <form onSubmit={submit} className="space-y-3">
            <input required placeholder="اسم الموظف" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="w-full rounded-xl border border-ink/10 bg-paper px-3 py-3 text-sm outline-none focus:border-copper" />
            <input required type="email" placeholder="البريد الإلكتروني" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} className="w-full rounded-xl border border-ink/10 bg-paper px-3 py-3 text-sm outline-none focus:border-copper" />
            <input type="tel" inputMode="tel" placeholder="رقم الهاتف (اختياري)" aria-label="رقم الهاتف" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} className="w-full rounded-xl border border-ink/10 bg-paper px-3 py-3 text-sm outline-none focus:border-copper" />
            <select value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})} className="w-full rounded-xl border border-ink/10 bg-paper px-3 py-3 text-sm outline-none focus:border-copper">{roles.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select>
            <div className="relative"><KeyRound size={16} className="absolute right-3 top-3.5 text-muted"/><input type="password" minLength={6} placeholder="كلمة مرور (اختياري: تُنشأ تلقائيًا)" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} className="w-full rounded-xl border border-ink/10 bg-paper py-3 pr-9 pl-3 text-sm outline-none focus:border-copper" /></div>
            <Button type="button" onClick={submit} disabled={saving} className="w-full">{saving ? "جارِ إنشاء الحساب…" : "إنشاء الحساب"}</Button>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4"><div><h2 className="font-black">حسابات الفريق</h2><p className="text-xs text-muted">{staff.length} حسابات مُدارة من المالك</p></div><Shield size={18} className="text-copper"/></div>
          <div className="divide-y divide-ink/8">
            {staff.length === 0 && <div className="p-8 text-center text-sm text-muted">لم تتم إضافة موظفين بعد.</div>}
            {staff.map((m)=><div key={m.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><strong>{m.name}</strong><Badge tone={m.active ? "good" : "danger"}>{m.active ? "نشط" : "متوقف"}</Badge></div><p className="mt-1 truncate text-xs text-muted">{m.email}</p></div>
              <div className="flex flex-col items-start gap-1 lg:items-end">
                <Badge tone="neutral">{labels[m.role] || m.role}</Badge>
                <span className="text-xs text-muted">{(m.permissions || []).length} صلاحية{m.custom_permissions ? "، مخصّصة" : ""}</span>
                <span className="text-xs text-muted">{activityLabel(m.last_active_at)} · أُضيف {dateLabel(m.created_at)}</span>
              </div>
              <div className="flex flex-wrap gap-2"><button onClick={()=>openPermissions(m)} className="rounded-xl border border-ink/10 px-3 py-2 text-xs font-bold hover:border-copper">الصلاحيات</button><button onClick={()=>toggle(m)} className="rounded-xl border border-ink/10 px-3 py-2 text-xs font-bold">{m.active?"إيقاف":"تفعيل"}</button><button onClick={()=>remove(m)} className="rounded-xl border border-brick/20 p-2 text-brick hover:bg-brick/5" title="حذف الحساب"><Trash2 size={16}/></button></div>
            </div>)}
          </div>
        </Card>
      </div>
      <Modal
        open={Boolean(editing)}
        onClose={() => !editing?.saving && setEditing(null)}
        size="lg"
        title={editing ? `صلاحيات ${editing.member.name}` : ""}
        description={editing ? `الدور: ${labels[editing.member.role] || editing.member.role}. الصلاحيات غير المحددة مخفية عنه ومرفوضة من الخادم أيضًا.` : ""}
        footer={editing && <>
          <Button variant="ghost" onClick={() => savePermissions(true)} disabled={editing.saving}>إرجاع صلاحيات الدور الافتراضية</Button>
          <Button variant="secondary" onClick={() => setEditing(null)} disabled={editing.saving}>تراجع</Button>
          <Button onClick={() => savePermissions(false)} loading={editing.saving}>حفظ الصلاحيات</Button>
        </>}
      >
        {editing && (
          <div className="space-y-5">
            {editing.error && <Alert tone="danger">{errorText(editing.error, "تعذّر حفظ الصلاحيات.")}</Alert>}
            {PERMISSION_GROUPS.map((group) => (
              <fieldset key={group.title}>
                <legend className="mb-2 text-sm font-extrabold text-ink">{group.title}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.items.map((p) => {
                    const grantable = can(p); // you can't grant what you don't hold
                    return (
                      <label key={p} className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm ${editing.perms.includes(p) ? "border-copper bg-copper/[0.06]" : "border-line"} ${grantable ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
                        <input type="checkbox" className="h-4 w-4 accent-[var(--color-copper)]" checked={editing.perms.includes(p)} disabled={!grantable || editing.saving} onChange={() => togglePerm(p)} />
                        <span className="font-bold">{PERMISSION_LABELS[p]}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
