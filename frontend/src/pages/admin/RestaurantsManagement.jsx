/* ==========================================================================
   RestaurantsManagement.jsx — platform admin: all restaurants.
   Create a restaurant (owner account, password shown once), edit its details,
   change the plan, enable/disable the account, and delete it permanently
   (typing the owner's email to confirm). Every action is admin-only in the
   API (role:admin + manage_admin) and written to the audit log.
   ========================================================================== */
import { useEffect, useMemo, useState } from "react";
import { Building2, Copy, Pencil, Plus, RefreshCw, Search, Trash2, XCircle } from "lucide-react";
import {
  createRestaurant, deleteRestaurant, getAllRestaurants, overrideRestaurantPlan, setOwnerActive, updateRestaurant,
} from "../../api/admin";
import AdminPageShell from "../../components/layout/AdminPageShell";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { errorText } from "../../utils/errors";

const PLANS = [["trial", "تجربة مجانية"], ["basic", "Basic"], ["pro", "Pro"], ["premium", "Premium"]];
const PLAN_LABEL = Object.fromEntries(PLANS);
const EMPTY = { name: "", email: "", restaurant_name: "", restaurant_phone: "", plan: "trial" };
const dateLabel = (iso) => (iso ? new Date(iso).toLocaleDateString("ar-PS-u-nu-latn", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default function RestaurantsManagement() {
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [form, setForm] = useState(null); // { mode: "create"|"edit", id?, values, saving, error }
  const [created, setCreated] = useState(null); // { email, password }
  const [deleting, setDeleting] = useState(null); // { row, email, saving, error }

  async function load() {
    setLoading(true);
    try { setRows((await getAllRestaurants()) || []); setError(null); } catch (e) { setError(e); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => `${r.restaurant_name || ""} ${r.email || ""} ${r.name || ""} ${r.restaurant_phone || ""}`.toLowerCase().includes(query.toLowerCase())), [rows, query]);

  const patchRow = (id, data) => setRows((list) => list.map((r) => (r.id === id ? { ...r, ...data } : r)));

  async function changePlan(row, plan) {
    setBusy(row.id);
    try { patchRow(row.id, await overrideRestaurantPlan(row.id, plan)); toast.success(`أصبحت باقة ${row.restaurant_name || row.email}: ${PLAN_LABEL[plan]}.`); }
    catch (e) { toast.error(errorText(e, "تعذّر تغيير الباقة.")); } finally { setBusy(null); }
  }

  async function toggleActive(row) {
    const disabling = row.is_active !== false;
    if (disabling && !(await confirm({
      title: `تعطيل ${row.restaurant_name || row.email}؟`,
      description: "لن يستطيع صاحب المطعم ولا موظفوه الدخول حتى تعيد التفعيل. البيانات تبقى محفوظة.",
      confirmLabel: "تعطيل المطعم", tone: "danger",
    }))) return;
    setBusy(row.id);
    try { patchRow(row.id, await setOwnerActive(row.id, !disabling)); toast.success(disabling ? "عُطّل المطعم." : "أُعيد تفعيل المطعم."); }
    catch (e) { toast.error(errorText(e, "تعذّر تغيير حالة الحساب.")); } finally { setBusy(null); }
  }

  async function submitForm(event) {
    event.preventDefault();
    setForm((f) => ({ ...f, saving: true, error: null }));
    try {
      if (form.mode === "create") {
        const result = await createRestaurant(form.values);
        setRows((list) => [result.restaurant, ...list]);
        setCreated({ email: result.restaurant.email, password: result.generated_password });
      } else {
        const { name, email, restaurant_name, restaurant_phone } = form.values;
        patchRow(form.id, await updateRestaurant(form.id, { name, email, restaurant_name, restaurant_phone }));
        toast.success("حُفظت بيانات المطعم.");
      }
      setForm(null);
    } catch (e) {
      setForm((f) => ({ ...f, saving: false, error: e }));
    }
  }

  async function submitDelete(event) {
    event.preventDefault();
    setDeleting((d) => ({ ...d, saving: true, error: null }));
    try {
      await deleteRestaurant(deleting.row.id, deleting.email);
      setRows((list) => list.filter((r) => r.id !== deleting.row.id));
      toast.success(`حُذف ${deleting.row.restaurant_name || deleting.row.email} نهائيًا.`);
      setDeleting(null);
    } catch (e) {
      setDeleting((d) => ({ ...d, saving: false, error: e }));
    }
  }

  const field = (key) => ({ value: form.values[key] ?? "", onChange: (e) => setForm((f) => ({ ...f, values: { ...f.values, [key]: e.target.value } })) });

  return (
    <AdminPageShell>
      {confirmDialog}
      <section className="admin-heading">
        <div>
          <p className="admin-overline"><Building2 size={14} aria-hidden="true" /> إدارة المنصة</p>
          <h1>المطاعم</h1>
          <p>أضف مطعمًا، عدّل بياناته أو باقته، عطّله مؤقتًا، أو احذفه نهائيًا.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} loading={loading}><RefreshCw size={15} aria-hidden="true" /> تحديث</Button>
          <Button onClick={() => setForm({ mode: "create", values: { ...EMPTY }, saving: false, error: null })}><Plus size={16} aria-hidden="true" /> إضافة مطعم</Button>
        </div>
      </section>

      {error && <Alert tone="danger" className="mb-4" action={<Button size="sm" variant="secondary" onClick={load}>إعادة المحاولة</Button>}>{errorText(error, "تعذّر تحميل المطاعم.")}</Alert>}

      {created && (
        <Alert tone="success" className="mb-4" title="أُنشئ المطعم. احفظ بيانات الدخول الآن، لن تظهر كلمة المرور مرة أخرى."
          onDismiss={() => setCreated(null)}
          action={created.password && <Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(`${created.email}\n${created.password}`).then(() => toast.success("نُسخت بيانات الدخول."))}><Copy size={14} aria-hidden="true" /> نسخ</Button>}>
          <span dir="ltr" className="font-mono">{created.email}{created.password ? ` · ${created.password}` : ""}</span>
        </Alert>
      )}

      <section className="admin-table-card">
        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={18} aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث باسم المطعم أو البريد أو الهاتف…" aria-label="بحث في المطاعم" />
            {query && <button onClick={() => setQuery("")} aria-label="مسح البحث"><XCircle size={15} aria-hidden="true" /></button>}
          </div>
          <span>{filtered.length} من {rows.length} مطعم</span>
        </div>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead><tr><th>المطعم</th><th>صاحب المطعم</th><th>الباقة</th><th>الحساب</th><th>التسجيل</th><th>إجراءات</th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.restaurant_name || "بدون اسم"}</strong><div className="text-xs text-muted">{r.restaurant_phone || "—"}</div></td>
                  <td>{r.name || "—"}<div className="text-xs text-muted" dir="ltr">{r.email}</div></td>
                  <td>
                    <select value={r.plan || "trial"} disabled={busy === r.id} onChange={(e) => changePlan(r, e.target.value)} aria-label={`باقة ${r.restaurant_name || r.email}`}
                      className="h-9 rounded-lg border border-line bg-surface px-2 text-xs font-bold text-ink">
                      {PLANS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    {r.plan === "trial" && r.trial_ends_at && <div className="mt-1 text-xs text-muted">تنتهي {dateLabel(r.trial_ends_at)}</div>}
                  </td>
                  <td><span className={`admin-status ${r.is_active === false ? "inactive" : "active"}`}><i />{r.is_active === false ? "معطّل" : "نشط"}</span></td>
                  <td className="text-xs">{dateLabel(r.created_at)}</td>
                  <td>
                    <div className="admin-actions">
                      <button className="admin-edit" onClick={() => setForm({ mode: "edit", id: r.id, values: { name: r.name || "", email: r.email || "", restaurant_name: r.restaurant_name || "", restaurant_phone: r.restaurant_phone || "" }, saving: false, error: null })}><Pencil size={14} aria-hidden="true" /> تعديل</button>
                      <button className={r.is_active === false ? "admin-enable" : "admin-disable"} disabled={busy === r.id} onClick={() => toggleActive(r)}>{r.is_active === false ? "تفعيل" : "تعطيل"}</button>
                      <button className="admin-disable" onClick={() => setDeleting({ row: r, email: "", saving: false, error: null })} aria-label={`حذف ${r.restaurant_name || r.email}`}><Trash2 size={14} aria-hidden="true" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="admin-empty">جارٍ تحميل المطاعم…</div>}
          {!loading && !filtered.length && <div className="admin-empty">{rows.length ? "لا توجد مطاعم مطابقة للبحث." : "لا توجد مطاعم بعد. أضف أول مطعم من الزر أعلاه."}</div>}
        </div>
      </section>

      <Modal open={Boolean(form)} onClose={() => !form?.saving && setForm(null)} title={form?.mode === "create" ? "إضافة مطعم" : "تعديل بيانات المطعم"}
        description={form?.mode === "create" ? "يُنشأ حساب صاحب المطعم بكلمة مرور مؤقتة تظهر مرة واحدة." : undefined}>
        {form && (
          <form onSubmit={submitForm} className="space-y-4">
            {form.error && <Alert tone="danger">{errorText(form.error, "تعذّر الحفظ.")}</Alert>}
            <Input label="اسم المطعم" required maxLength={255} {...field("restaurant_name")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="اسم صاحب المطعم" required maxLength={255} {...field("name")} />
              <Input label="الهاتف" type="tel" maxLength={50} {...field("restaurant_phone")} />
            </div>
            <Input label="البريد الإلكتروني (لتسجيل الدخول)" type="email" required dir="ltr" {...field("email")} />
            {form.mode === "create" && (
              <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
                الباقة
                <select {...field("plan")} className="h-11 rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm">
                  {PLANS.map(([value, label]) => <option key={value} value={value}>{label}{value === "trial" ? " (14 يومًا)" : ""}</option>)}
                </select>
              </label>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setForm(null)} disabled={form.saving}>تراجع</Button>
              <Button type="submit" loading={form.saving}>{form.mode === "create" ? "إنشاء المطعم" : "حفظ"}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={Boolean(deleting)} onClose={() => !deleting?.saving && setDeleting(null)} size="sm"
        title={deleting ? `حذف ${deleting.row.restaurant_name || deleting.row.email} نهائيًا؟` : ""}
        description="تُحذف كل بيانات المطعم: الحسابات والطاولات والمنيو والطلبات والمدفوعات. لا يمكن التراجع. للتعطيل المؤقت استخدم «تعطيل» بدلًا من ذلك.">
        {deleting && (
          <form onSubmit={submitDelete} className="space-y-4">
            {deleting.error && <Alert tone="danger">{errorText(deleting.error, "تعذّر الحذف.")}</Alert>}
            <Input label={`اكتب بريد صاحب المطعم للتأكيد: ${deleting.row.email}`} dir="ltr" required autoFocus value={deleting.email}
              onChange={(e) => setDeleting((d) => ({ ...d, email: e.target.value, error: null }))} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleting.saving}>تراجع</Button>
              <Button type="submit" variant="danger" loading={deleting.saving}
                disabled={deleting.email.trim().toLowerCase() !== String(deleting.row.email).toLowerCase()}>حذف نهائي</Button>
            </div>
          </form>
        )}
      </Modal>
    </AdminPageShell>
  );
}
