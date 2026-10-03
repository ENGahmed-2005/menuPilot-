/* ==========================================================================
   Finance.jsx — salaries, expenses and profit (/owner/finance).
   Overview: revenue − salaries − expenses = net profit for a month, the
   last six months, and expenses by category. Employees: monthly salaries,
   with or without a login account (prorated by the days employed). Expenses:
   one-off or monthly (rent…). Numbers come from App\Support\Finance.
   ========================================================================== */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, Pencil, Plus, Receipt, Trash2, Users, Wallet } from "lucide-react";
import Card from "../../components/dashboard/Card";
import PageHeader from "../../components/dashboard/PageHeader";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";
import Spinner from "../../components/ui/Spinner";
import SegmentedControl from "../../components/ui/SegmentedControl";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";
import { errorText } from "../../utils/errors";
import { money } from "../../utils/format";
import { locale, t } from "../../i18n";
import * as fin from "../../api/finance";

const CATEGORIES = {
  rent: t("إيجار"),
  utilities: t("فواتير (كهرباء وماء وغاز)"),
  supplies: t("مواد خام ومشتريات"),
  maintenance: t("صيانة"),
  marketing: t("تسويق"),
  other: t("أخرى"),
};
const thisMonth = () => new Date().toISOString().slice(0, 7);
const today = () => new Date().toISOString().slice(0, 10);
const monthName = (ym, style = "long") => new Date(`${ym}-01T12:00:00`).toLocaleDateString(locale, { month: style, year: style === "long" ? "numeric" : undefined });
const dateLabel = (d) => (d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : "");
const field = "h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-copper";

function Stat({ icon: Icon, label, value, hint, tone }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-muted"><Icon size={16} aria-hidden="true" />{label}</div>
      <p className={`num mt-2 text-2xl font-extrabold ${tone || "text-ink"}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

function Overview({ month }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { setData(null); fin.getFinanceSummary(month).then(setData).catch(setError); }, [month]);
  if (error) return <Alert tone="danger">{errorText(error, t("تعذّر تحميل الأرقام المالية."))}</Alert>;
  if (!data) return <div className="py-10 text-center"><Spinner /></div>;
  const positive = data.profit >= 0;
  const max = Math.max(1, ...data.series.flatMap((m) => [m.revenue, m.costs]));
  const categories = Object.entries(data.expenses_by_category).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const catMax = Math.max(1, ...categories.map(([, v]) => v));
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className={`p-5 sm:col-span-2 xl:col-span-1 xl:row-span-2 ${positive ? "border-herb/40" : "border-brick/40"}`}>
          <p className="text-sm font-bold text-muted">{t("صافي الربح")} · {monthName(data.month)}</p>
          <p className={`num mt-3 text-4xl font-extrabold ${positive ? "text-herb" : "text-brick"}`}>{money(data.profit)}</p>
          <p className="mt-2 text-sm text-muted">{data.margin === null ? t("لا إيراد في هذا الشهر بعد.") : t("نسبة الربح {0}% من الإيراد", { 0: data.margin })}</p>
          <p className="mt-4 text-xs leading-6 text-muted">{t("الإيراد ناقص الرواتب والمصاريف. الرواتب تُحسب حسب أيام عمل كل موظف في الشهر.")}</p>
        </Card>
        <Stat icon={Banknote} label={t("الإيراد")} value={money(data.revenue)} hint={t("الطاولات {0}، والطلبات الخارجية {1}", { 0: money(data.revenue_tables), 1: money(data.revenue_outside) })} />
        <Stat icon={Users} label={t("الرواتب")} value={money(data.salaries)} hint={t("{0} موظف هذا الشهر", { 0: data.employees })} />
        <Stat icon={Receipt} label={t("المصاريف")} value={money(data.expenses)} />
      </div>

      <Card className="p-5">
        <h2 className="text-base font-extrabold">{t("آخر 6 أشهر")}</h2>
        <p className="mt-1 text-sm text-muted">{t("الإيراد مقابل التكاليف (الرواتب والمصاريف)، والربح تحت كل شهر.")}</p>
        <div className="mt-5 grid grid-cols-6 items-end gap-2" role="img" aria-label={t("مقارنة الإيراد والتكاليف لآخر 6 أشهر")}>
          {data.series.map((m) => (
            <div key={m.month} className="flex flex-col items-center gap-1.5">
              <div className="flex h-40 w-full items-end justify-center gap-1">
                <span className="w-1/3 rounded-t bg-copper" style={{ height: `${(m.revenue / max) * 100}%` }} title={`${t("الإيراد")}: ${money(m.revenue)}`} />
                <span className="w-1/3 rounded-t bg-navy" style={{ height: `${(m.costs / max) * 100}%` }} title={`${t("التكاليف")}: ${money(m.costs)}`} />
              </div>
              <span className="text-xs font-bold text-muted">{monthName(m.month, "short")}</span>
              <span className={`num text-xs font-extrabold ${m.profit >= 0 ? "text-herb" : "text-brick"}`}>{money(m.profit)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-4 text-xs font-bold text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-copper" />{t("الإيراد")}</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-navy" />{t("التكاليف")}</span>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-extrabold">{t("المصاريف حسب الفئة")}</h2>
        {categories.length === 0
          ? <p className="mt-3 text-sm text-muted">{t("لا مصاريف مسجلة في هذا الشهر.")}</p>
          : <ul className="mt-4 space-y-3">{categories.map(([key, value]) => (
              <li key={key}>
                <div className="flex justify-between text-sm"><span className="font-bold">{CATEGORIES[key] || key}</span><span className="num font-bold">{money(value)}</span></div>
                <div className="mt-1 h-2 rounded-full bg-line"><div className="h-2 rounded-full bg-copper" style={{ width: `${(value / catMax) * 100}%` }} /></div>
              </li>))}</ul>}
      </Card>
    </div>
  );
}

const emptyEmployee = { name: "", job_title: "", monthly_salary: "", starts_on: today(), ends_on: "" };

function Employees() {
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [list, setList] = useState(null);
  const [form, setForm] = useState(emptyEmployee);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const load = useCallback(() => fin.getEmployees().then(setList).catch(setError), []);
  useEffect(() => { load(); }, [load]);
  const active = (list || []).filter((e) => !e.ends_on || e.ends_on >= today());
  const payroll = active.reduce((sum, e) => sum + Number(e.monthly_salary), 0);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault(); setSaving(true); setError(null);
    const body = { ...form, monthly_salary: Number(form.monthly_salary), ends_on: form.ends_on || null, starts_on: form.starts_on || null, job_title: form.job_title || null };
    try {
      if (editing) await fin.updateEmployee(editing, body); else await fin.addEmployee(body);
      toast.success(editing ? t("حُفظت بيانات {0}.", { 0: form.name }) : t("أُضيف {0} إلى الرواتب.", { 0: form.name }));
      setForm(emptyEmployee); setEditing(null); load();
    } catch (err) { setError(err); } finally { setSaving(false); }
  }
  async function remove(emp) {
    const ok = await confirm({ title: t("حذف {0} من الرواتب؟", { 0: emp.name }), description: t("لا يُحسب راتبه في أي شهر بعد الحذف، ولا في الأشهر السابقة. إن ترك العمل، الأفضل أن تضع تاريخ انتهاء بدلاً من الحذف."), confirmLabel: t("حذف"), tone: "danger" });
    if (!ok) return;
    try { await fin.removeEmployee(emp.id); toast.success(t("حُذف {0}.", { 0: emp.name })); load(); } catch (err) { setError(err); }
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat icon={Wallet} label={t("الرواتب الشهرية الحالية")} value={money(payroll)} />
          <Stat icon={Users} label={t("موظفون حاليون")} value={active.length} />
        </div>
        {error && <Alert tone="danger" onDismiss={() => setError(null)}>{errorText(error, t("تعذّر حفظ التغيير."))}</Alert>}
        <Card>
          {list === null ? <div className="py-10 text-center"><Spinner /></div> : list.length === 0 ? (
            <p className="p-6 text-sm text-muted">{t("لم تُضف موظفين بعد. أضف أول موظف وراتبه من النموذج.")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {list.map((emp) => {
                const ended = emp.ends_on && emp.ends_on < today();
                return (
                  <li key={emp.id} className={`flex flex-wrap items-center gap-3 p-4 ${ended ? "opacity-60" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink">{emp.name}{emp.job_title && <span className="font-medium text-muted"> · {emp.job_title}</span>}</p>
                      <p className="text-xs text-muted">{emp.starts_on ? t("منذ {0}", { 0: dateLabel(emp.starts_on) }) : ""}{emp.ends_on ? ` · ${t("حتى {0}", { 0: dateLabel(emp.ends_on) })}` : ""}</p>
                    </div>
                    <p className="num font-extrabold">{money(emp.monthly_salary)}<span className="text-xs font-medium text-muted"> / {t("شهريًا")}</span></p>
                    <div className="flex gap-1">
                      <Button variant="ghost" onClick={() => { setEditing(emp.id); setForm({ name: emp.name, job_title: emp.job_title || "", monthly_salary: emp.monthly_salary, starts_on: emp.starts_on?.slice(0, 10) || "", ends_on: emp.ends_on?.slice(0, 10) || "" }); }} aria-label={t("تعديل {0}", { 0: emp.name })}><Pencil size={16} aria-hidden="true" /></Button>
                      <Button variant="ghost" onClick={() => remove(emp)} aria-label={t("حذف {0}", { 0: emp.name })}><Trash2 size={16} aria-hidden="true" /></Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
      <Card as="form" onSubmit={save} className="space-y-3 p-5">
        <h2 className="text-base font-extrabold">{editing ? t("تعديل موظف") : t("إضافة موظف")}</h2>
        <p className="text-xs leading-5 text-muted">{t("أي موظف يتقاضى راتبًا، حتى لو لم يكن له حساب على النظام.")}</p>
        <label className="block text-sm font-bold">{t("الاسم")}<input required maxLength={120} value={form.name} onChange={set("name")} className={`${field} mt-1.5`} /></label>
        <label className="block text-sm font-bold">{t("الوظيفة")}<input maxLength={80} value={form.job_title} onChange={set("job_title")} placeholder={t("مثل: شيف، نادل، عامل نظافة")} className={`${field} mt-1.5`} /></label>
        <label className="block text-sm font-bold">{t("الراتب الشهري (₪)")}<input required type="number" min="0" step="0.01" inputMode="decimal" value={form.monthly_salary} onChange={set("monthly_salary")} className={`${field} num mt-1.5`} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-bold">{t("بدأ العمل")}<input type="date" value={form.starts_on} onChange={set("starts_on")} className={`${field} mt-1.5`} /></label>
          <label className="block text-sm font-bold">{t("ترك العمل")}<input type="date" value={form.ends_on} onChange={set("ends_on")} className={`${field} mt-1.5`} /></label>
        </div>
        <p className="text-xs text-muted">{t("اترك «ترك العمل» فارغًا لمن ما زال يعمل.")}</p>
        <div className="flex gap-2 pt-1">
          <Button type="submit" loading={saving}><Plus size={16} aria-hidden="true" />{editing ? t("حفظ") : t("إضافة")}</Button>
          {editing && <Button type="button" variant="secondary" onClick={() => { setEditing(null); setForm(emptyEmployee); }}>{t("إلغاء")}</Button>}
        </div>
      </Card>
      {confirmDialog}
    </div>
  );
}

const emptyExpense = { category: "supplies", title: "", amount: "", spent_on: today(), recurring: false, ends_on: "" };

function Expenses({ month }) {
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [list, setList] = useState(null);
  const [form, setForm] = useState(emptyExpense);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const load = useCallback(() => fin.getExpenses(month).then(setList).catch(setError), [month]);
  useEffect(() => { setList(null); load(); }, [load]);
  const total = useMemo(() => (list || []).reduce((s, x) => s + Number(x.amount), 0), [list]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function save(e) {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      await fin.addExpense({ ...form, amount: Number(form.amount), ends_on: form.recurring && form.ends_on ? form.ends_on : null });
      toast.success(t("سُجّل المصروف «{0}».", { 0: form.title }));
      setForm({ ...emptyExpense, category: form.category }); load();
    } catch (err) { setError(err); } finally { setSaving(false); }
  }
  async function remove(x) {
    const ok = await confirm({ title: t("حذف «{0}»؟", { 0: x.title }), description: x.recurring ? t("مصروف شهري: يُحذف من كل الأشهر، ومنها الأشهر السابقة.") : t("يُحذف من حساب الربح لهذا الشهر."), confirmLabel: t("حذف"), tone: "danger" });
    if (!ok) return;
    try { await fin.removeExpense(x.id); load(); } catch (err) { setError(err); }
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <Stat icon={Receipt} label={t("مصاريف {0}", { 0: monthName(month) })} value={money(total)} hint={t("المصاريف الشهرية تُحسب في كل شهر حتى تاريخ انتهائها.")} />
        {error && <Alert tone="danger" onDismiss={() => setError(null)}>{errorText(error, t("تعذّر حفظ التغيير."))}</Alert>}
        <Card>
          {list === null ? <div className="py-10 text-center"><Spinner /></div> : list.length === 0 ? (
            <p className="p-6 text-sm text-muted">{t("لا مصاريف في هذا الشهر.")}</p>
          ) : (
            <ul className="divide-y divide-line">
              {list.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">{x.title}{Number(x.recurring) ? <span className="ms-2 rounded-full bg-copper/15 px-2 py-0.5 text-xs font-bold text-copper-ink">{t("شهري")}</span> : null}</p>
                    <p className="text-xs text-muted">{CATEGORIES[x.category] || x.category} · {Number(x.recurring) ? t("منذ {0}", { 0: dateLabel(x.spent_on) }) : dateLabel(x.spent_on)}{x.ends_on ? ` · ${t("حتى {0}", { 0: dateLabel(x.ends_on) })}` : ""}</p>
                  </div>
                  <p className="num font-extrabold">{money(x.amount)}</p>
                  <Button variant="ghost" onClick={() => remove(x)} aria-label={t("حذف {0}", { 0: x.title })}><Trash2 size={16} aria-hidden="true" /></Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card as="form" onSubmit={save} className="space-y-3 p-5">
        <h2 className="text-base font-extrabold">{t("تسجيل مصروف")}</h2>
        <label className="block text-sm font-bold">{t("الفئة")}
          <select value={form.category} onChange={set("category")} className={`${field} mt-1.5`}>{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <label className="block text-sm font-bold">{t("الوصف")}<input required maxLength={120} value={form.title} onChange={set("title")} placeholder={t("مثل: خضار الأسبوع، فاتورة الكهرباء")} className={`${field} mt-1.5`} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-bold">{t("المبلغ (₪)")}<input required type="number" min="0" step="0.01" inputMode="decimal" value={form.amount} onChange={set("amount")} className={`${field} num mt-1.5`} /></label>
          <label className="block text-sm font-bold">{t("التاريخ")}<input required type="date" value={form.spent_on} onChange={set("spent_on")} className={`${field} mt-1.5`} /></label>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-line px-3 text-sm font-bold">
          {t("يتكرر كل شهر (مثل الإيجار)")}<input type="checkbox" checked={form.recurring} onChange={set("recurring")} className="h-5 w-5" />
        </label>
        {form.recurring && <label className="block text-sm font-bold">{t("ينتهي في (اختياري)")}<input type="date" value={form.ends_on} onChange={set("ends_on")} className={`${field} mt-1.5`} /></label>}
        <Button type="submit" loading={saving}><Plus size={16} aria-hidden="true" />{t("تسجيل")}</Button>
      </Card>
      {confirmDialog}
    </div>
  );
}

export default function Finance() {
  const [tab, setTab] = useState("overview");
  const [month, setMonth] = useState(thisMonth);
  return (
    <div>
      <PageHeader
        title={t("الأرباح والمصاريف")}
        description={t("سجّل رواتب الموظفين ومصاريف المطعم، واعرف ربحك الحقيقي كل شهر.")}
        action={<label className="flex items-center gap-2 text-sm font-bold">{t("الشهر")}<input type="month" value={month} max={thisMonth()} onChange={(e) => setMonth(e.target.value || thisMonth())} className="h-11 rounded-xl border border-line bg-surface px-3 text-sm" /></label>}
      />
      <div className="mb-5">
        <SegmentedControl label={t("القسم")} value={tab} onChange={setTab} options={[{ value: "overview", label: t("نظرة عامة") }, { value: "employees", label: t("الموظفون والرواتب") }, { value: "expenses", label: t("المصاريف") }]} />
      </div>
      {tab === "overview" && <Overview month={month} />}
      {tab === "employees" && <Employees />}
      {tab === "expenses" && <Expenses month={month} />}
    </div>
  );
}
