/* ==========================================================================
   RestaurantsManagement.jsx — platform admin: all restaurants.
   Create a restaurant (owner account, password shown once), edit its details,
   change the plan and add-ons, grant or revoke features (restaurant
   permissions, like staff permissions in the owner panel), enable/disable
   the account, and delete it permanently
   (typing the owner's email to confirm). Every action is admin-only in the
   API (role:admin + manage_admin) and written to the audit log.
   ========================================================================== */
import { useEffect, useMemo, useState } from "react";
import { Building2, Copy, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, XCircle } from "lucide-react";
import {
  createRestaurant, deleteRestaurant, getAllRestaurants, getRestaurantFeatures, overrideRestaurantPlan, setOwnerActive, setRestaurantFeatures, updateRestaurant,
} from "../../api/admin";
import AdminPageShell from "../../components/layout/AdminPageShell";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import { useToast } from "../../components/ui/Toast";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { errorText } from "../../utils/errors";
import AddonToggles from "../../components/subscription/AddonToggles";
import { SUBSCRIPTION_ADDONS } from "../../config/subscriptions";
import { t, locale } from "../../i18n";

const PLANS = [["trial", t("تجربة مجانية")], ["basic", "Basic"], ["pro", "Pro"], ["delivery_only", t("التوصيل فقط")]];
const PLAN_LABEL = Object.fromEntries(PLANS);
const EMPTY = { name: "", email: "", restaurant_name: "", restaurant_phone: "", plan: "trial" };
const dateLabel = (iso) => (iso ? new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : "—");

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
  const [features, setFeatures] = useState(null); // { row, sheet, enabled, saving, error }

  async function load() {
    setLoading(true);
    try { setRows((await getAllRestaurants()) || []); setError(null); } catch (e) { setError(e); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) => `${r.restaurant_name || ""} ${r.email || ""} ${r.name || ""} ${r.restaurant_phone || ""}`.toLowerCase().includes(query.toLowerCase())), [rows, query]);

  const patchRow = (id, data) => setRows((list) => list.map((r) => (r.id === id ? { ...r, ...data } : r)));

  async function changePlan(row, plan, addons) {
    setBusy(row.id);
    try {
      const updated = await overrideRestaurantPlan(row.id, plan, addons);
      patchRow(row.id, updated);
      const extras = (updated?.addons || []).map((id) => SUBSCRIPTION_ADDONS[id]?.name).filter(Boolean);
      toast.success(t("أصبحت باقة {0}: {1}.", { 0: row.restaurant_name || row.email, 1: [PLAN_LABEL[plan], ...extras].join(" + ") }));
    } catch (e) { toast.error(errorText(e, t("تعذّر تغيير الباقة."))); } finally { setBusy(null); }
  }

  // Restaurant permissions: the full list is saved (like staff permissions); reset = the plan's defaults.
  async function openFeatures(row) {
    setFeatures({ row, sheet: null, enabled: [], saving: false, error: null });
    try {
      const sheet = await getRestaurantFeatures(row.id);
      setFeatures((f) => f && { ...f, sheet, enabled: sheet.groups.flatMap((g) => g.items).filter((i) => i.enabled).map((i) => i.key) });
    } catch (e) { setFeatures((f) => f && { ...f, error: e }); }
  }
  const toggleFeature = (key) => setFeatures((f) => ({ ...f, enabled: f.enabled.includes(key) ? f.enabled.filter((k) => k !== key) : [...f.enabled, key] }));
  async function saveFeatures(reset = false) {
    setFeatures((f) => ({ ...f, saving: true, error: null }));
    try {
      const sheet = await setRestaurantFeatures(features.row.id, reset ? null : features.enabled);
      patchRow(features.row.id, { feature_overrides: sheet.overrides.grant.length || sheet.overrides.revoke.length ? sheet.overrides : null });
      toast.success(reset ? t("عادت صلاحيات {0} إلى افتراضي الخطة.", { 0: features.row.restaurant_name || features.row.email }) : t("حُفظت صلاحيات {0}.", { 0: features.row.restaurant_name || features.row.email }));
      setFeatures(null);
    } catch (e) { setFeatures((f) => ({ ...f, saving: false, error: e })); }
  }

  async function toggleActive(row) {
    const disabling = row.is_active !== false;
    if (disabling && !(await confirm({
      title: t("تعطيل {0}؟", { 0: row.restaurant_name || row.email }),
      description: t("لن يستطيع صاحب المطعم ولا موظفوه الدخول حتى تعيد التفعيل. البيانات تبقى محفوظة."),
      confirmLabel: t("تعطيل المطعم"), tone: "danger",
    }))) return;
    setBusy(row.id);
    try { patchRow(row.id, await setOwnerActive(row.id, !disabling)); toast.success(disabling ? t("عُطّل المطعم.") : t("أُعيد تفعيل المطعم.")); }
    catch (e) { toast.error(errorText(e, t("تعذّر تغيير حالة الحساب."))); } finally { setBusy(null); }
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
        toast.success(t("حُفظت بيانات المطعم."));
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
      toast.success(t("حُذف {0} نهائيًا.", { 0: deleting.row.restaurant_name || deleting.row.email }));
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
          <p className="admin-overline"><Building2 size={14} aria-hidden="true" /> {t("إدارة المنصة")}</p>
          <h1>{t("المطاعم")}</h1>
          <p>{t("أضف مطعمًا، عدّل بياناته أو باقته، عطّله مؤقتًا، أو احذفه نهائيًا.")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} loading={loading}><RefreshCw size={15} aria-hidden="true" /> {t("تحديث")}</Button>
          <Button onClick={() => setForm({ mode: "create", values: { ...EMPTY }, saving: false, error: null })}><Plus size={16} aria-hidden="true" /> {t("إضافة مطعم")}</Button>
        </div>
      </section>

      {error && <Alert tone="danger" className="mb-4" action={<Button size="sm" variant="secondary" onClick={load}>{t("إعادة المحاولة")}</Button>}>{errorText(error, t("تعذّر تحميل المطاعم."))}</Alert>}

      {created && (
        <Alert tone="success" className="mb-4" title={t("أُنشئ المطعم. احفظ بيانات الدخول الآن، لن تظهر كلمة المرور مرة أخرى.")}
          onDismiss={() => setCreated(null)}
          action={created.password && <Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(`${created.email}\n${created.password}`).then(() => toast.success(t("نُسخت بيانات الدخول.")))}><Copy size={14} aria-hidden="true" /> {t("نسخ")}</Button>}>
          <span dir="ltr" className="font-mono">{created.email}{created.password ? ` · ${created.password}` : ""}</span>
        </Alert>
      )}

      <section className="admin-table-card">
        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={18} aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ابحث باسم المطعم أو البريد أو الهاتف…")} aria-label={t("بحث في المطاعم")} />
            {query && <button onClick={() => setQuery("")} aria-label={t("مسح البحث")}><XCircle size={15} aria-hidden="true" /></button>}
          </div>
          <span>{filtered.length} {t("من")} {rows.length} {t("مطعم")}</span>
        </div>
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead><tr><th>{t("المطعم")}</th><th>{t("صاحب المطعم")}</th><th>{t("الباقة")}</th><th>{t("الإضافات")}</th><th>{t("الحساب")}</th><th>{t("التسجيل")}</th><th>{t("إجراءات")}</th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.restaurant_name || t("بدون اسم")}</strong><div className="text-xs text-muted">{r.restaurant_phone || "—"}</div></td>
                  <td>{r.name || "—"}<div className="text-xs text-muted" dir="ltr">{r.email}</div></td>
                  <td>
                    <select value={r.plan || "trial"} disabled={busy === r.id} onChange={(e) => changePlan(r, e.target.value)} aria-label={t("باقة {0}", { 0: r.restaurant_name || r.email })}
                      className="h-9 rounded-lg border border-line bg-surface px-2 text-xs font-bold text-ink">
                      {PLANS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    {r.plan === "trial" && r.trial_ends_at && <div className="mt-1 text-xs text-muted">{t("تنتهي")} {dateLabel(r.trial_ends_at)}</div>}
                    {(r.feature_overrides?.grant?.length > 0 || r.feature_overrides?.revoke?.length > 0) && <div className="mt-1 text-xs font-bold text-copper-ink">{t("صلاحيات مخصّصة")}</div>}
                  </td>
                  <td><AddonToggles row={r} disabled={busy === r.id} onChange={(addons) => changePlan(r, r.plan, addons)} /></td>
                  <td><span className={`admin-status ${r.is_active === false ? "inactive" : "active"}`}><i />{r.is_active === false ? t("معطّل") : t("نشط")}</span></td>
                  <td className="text-xs">{dateLabel(r.created_at)}</td>
                  <td>
                    <div className="admin-actions">
                      <button className="admin-edit" disabled={busy === r.id} onClick={() => openFeatures(r)}><ShieldCheck size={14} aria-hidden="true" /> {t("الصلاحيات")}</button>
                      <button className="admin-edit" onClick={() => setForm({ mode: "edit", id: r.id, values: { name: r.name || "", email: r.email || "", restaurant_name: r.restaurant_name || "", restaurant_phone: r.restaurant_phone || "" }, saving: false, error: null })}><Pencil size={14} aria-hidden="true" /> {t("تعديل")}</button>
                      <button className={r.is_active === false ? "admin-enable" : "admin-disable"} disabled={busy === r.id} onClick={() => toggleActive(r)}>{r.is_active === false ? t("تفعيل") : t("تعطيل")}</button>
                      <button className="admin-disable" onClick={() => setDeleting({ row: r, email: "", saving: false, error: null })} aria-label={t("حذف {0}", { 0: r.restaurant_name || r.email })}><Trash2 size={14} aria-hidden="true" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="admin-empty">{t("جارٍ تحميل المطاعم…")}</div>}
          {!loading && !filtered.length && <div className="admin-empty">{rows.length ? t("لا توجد مطاعم مطابقة للبحث.") : t("لا توجد مطاعم بعد. أضف أول مطعم من الزر أعلاه.")}</div>}
        </div>
      </section>

      <Modal open={Boolean(form)} onClose={() => !form?.saving && setForm(null)} title={form?.mode === "create" ? t("إضافة مطعم") : t("تعديل بيانات المطعم")}
        description={form?.mode === "create" ? t("يُنشأ حساب صاحب المطعم بكلمة مرور مؤقتة تظهر مرة واحدة.") : undefined}>
        {form && (
          <form onSubmit={submitForm} className="space-y-4">
            {form.error && <Alert tone="danger">{errorText(form.error, t("تعذّر الحفظ."))}</Alert>}
            <Input label={t("اسم المطعم")} required maxLength={255} {...field("restaurant_name")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t("اسم صاحب المطعم")} required maxLength={255} {...field("name")} />
              <Input label={t("الهاتف")} type="tel" maxLength={50} {...field("restaurant_phone")} />
            </div>
            <Input label={t("البريد الإلكتروني (لتسجيل الدخول)")} type="email" required dir="ltr" {...field("email")} />
            {form.mode === "create" && (
              <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
                {t("الباقة")}
                <select {...field("plan")} className="h-11 rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm">
                  {PLANS.map(([value, label]) => <option key={value} value={value}>{label}{value === "trial" ? t(" (14 يومًا)") : ""}</option>)}
                </select>
              </label>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setForm(null)} disabled={form.saving}>{t("تراجع")}</Button>
              <Button type="submit" loading={form.saving}>{form.mode === "create" ? t("إنشاء المطعم") : t("حفظ")}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(features)}
        onClose={() => !features?.saving && setFeatures(null)}
        size="lg"
        title={features ? t("صلاحيات {0}", { 0: features.row.restaurant_name || features.row.email }) : ""}
        description={features?.sheet ? t("الخطة: {0}. الميزات غير المحددة مخفية عن المطعم وموظفيه، ومرفوضة من الخادم أيضًا.", { 0: features.sheet.plan_label }) : ""}
        footer={features?.sheet && <>
          <Button variant="ghost" onClick={() => saveFeatures(true)} disabled={features.saving}>{t("إرجاع افتراضي الخطة")}</Button>
          <Button variant="secondary" onClick={() => setFeatures(null)} disabled={features.saving}>{t("تراجع")}</Button>
          <Button onClick={() => saveFeatures(false)} loading={features.saving}>{t("حفظ الصلاحيات")}</Button>
        </>}
      >
        {features && (
          <div className="space-y-5">
            {features.error && <Alert tone="danger">{errorText(features.error, t("تعذّر تحميل الصلاحيات أو حفظها."))}</Alert>}
            {!features.sheet && !features.error && <p className="text-sm text-muted">{t("جارٍ تحميل صلاحيات المطعم…")}</p>}
            {features.sheet?.groups.map((group) => (
              <fieldset key={group.title}>
                <legend className="mb-2 text-sm font-extrabold text-ink">{group.title}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.items.map((item) => {
                    const on = features.enabled.includes(item.key);
                    // Differs from the plan → the admin's own decision.
                    const custom = on !== item.from_plan;
                    return (
                      <label key={item.key} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 text-sm ${on ? "border-copper bg-copper/[0.06]" : "border-line"}`}>
                        <input type="checkbox" className="h-4 w-4 accent-[var(--color-copper)]" checked={on} disabled={features.saving} onChange={() => toggleFeature(item.key)} />
                        <span className="flex-1 font-bold">{item.label}</span>
                        <span className={`text-xs ${custom ? "font-bold text-copper-ink" : "text-muted"}`}>{custom ? (on ? t("ممنوحة") : t("مسحوبة")) : item.from_plan ? t("من الخطة") : t("خارج الخطة")}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={Boolean(deleting)} onClose={() => !deleting?.saving && setDeleting(null)} size="sm"
        title={deleting ? t("حذف {0} نهائيًا؟", { 0: deleting.row.restaurant_name || deleting.row.email }) : ""}
        description={t("تُحذف كل بيانات المطعم: الحسابات والطاولات والمنيو والطلبات والمدفوعات. لا يمكن التراجع. للتعطيل المؤقت استخدم «تعطيل» بدلًا من ذلك.")}>
        {deleting && (
          <form onSubmit={submitDelete} className="space-y-4">
            {deleting.error && <Alert tone="danger">{errorText(deleting.error, t("تعذّر الحذف."))}</Alert>}
            <Input label={t("اكتب بريد صاحب المطعم للتأكيد: {0}", { 0: deleting.row.email })} dir="ltr" required autoFocus value={deleting.email}
              onChange={(e) => setDeleting((d) => ({ ...d, email: e.target.value, error: null }))} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleting(null)} disabled={deleting.saving}>{t("تراجع")}</Button>
              <Button type="submit" variant="danger" loading={deleting.saving}
                disabled={deleting.email.trim().toLowerCase() !== String(deleting.row.email).toLowerCase()}>{t("حذف نهائي")}</Button>
            </div>
          </form>
        )}
      </Modal>
    </AdminPageShell>
  );
}
