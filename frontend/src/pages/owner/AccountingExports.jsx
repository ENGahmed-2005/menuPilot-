/* ==========================================================================
   AccountingExports.jsx — «المحاسبة والتصدير» (route /owner/accounting).
   Pick a report, a period and filters, see exactly what will be exported,
   then download a real .xlsx. Owners (and staff granted export permissions)
   export; accounting settings (profile, prefix, tax, account codes) need
   manage_accounting_settings. The API enforces every permission.
   ========================================================================== */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, FileSpreadsheet, Settings2 } from "lucide-react";
import { downloadExport, getAccountingSettings, saveAccountingSettings } from "../../api/accounting";
import { usePermissions } from "../../hooks/usePermissions";
import { errorText } from "../../utils/errors";
import PageHeader from "../../components/dashboard/PageHeader";
import Card, { CardHeader } from "../../components/dashboard/Card";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input, { fieldClasses } from "../../components/ui/Input";
import SegmentedControl from "../../components/ui/SegmentedControl";
import Skeleton from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { t as tr } from "../../i18n";

const TYPES = [
  { value: "invoices", label: tr("تفاصيل الفواتير"), hint: tr("سطر لكل صنف في كل فاتورة"), permission: ["export_invoices", "export_reports"], filters: ["payment_method", "payment_status", "invoice_status", "cashier_id", "category", "order_status"] },
  { value: "sales", label: tr("الفواتير"), hint: tr("سطر لكل فاتورة مع المدفوع والمتبقي"), permission: ["export_sales", "export_invoices", "export_reports"], filters: ["payment_method", "payment_status", "invoice_status", "cashier_id"] },
  { value: "payments", label: tr("المدفوعات"), hint: tr("كل دفعة وحالتها وحسابها"), permission: ["export_payments", "export_reports"], filters: ["payment_method", "payment_status", "cashier_id"] },
  { value: "products", label: tr("مبيعات الأصناف"), hint: tr("الكميات والصافي لكل صنف"), permission: ["export_sales", "export_reports"], filters: ["category"] },
  { value: "daily", label: tr("المبيعات اليومية"), hint: tr("ملخص لكل يوم"), permission: ["export_sales", "export_reports"], filters: [] },
];
const RANGES = [["today", tr("اليوم")], ["yesterday", tr("أمس")], ["this_week", tr("هذا الأسبوع")], ["this_month", tr("هذا الشهر")], ["previous_month", tr("الشهر السابق")], ["custom", tr("مخصص")]];
const METHODS = [["", tr("كل الطرق")], ["cash", tr("نقدًا")], ["bank", tr("تحويل بنكي")], ["wallet", tr("محفظة إلكترونية")], ["electronic", tr("دفع إلكتروني")], ["ussd", "USSD"]];
const PAY_STATUS = [["", tr("كل الحالات")], ["paid", tr("مدفوع")], ["pending", tr("معلّق")], ["pending_reconciliation", tr("بانتظار التسوية")], ["rejected", tr("مرفوض")]];
const INVOICE_STATUS = [["paid", tr("الفواتير النهائية (المغلقة)")], ["pending", tr("غير المغلقة")], ["cancelled", tr("الملغاة")], ["all", tr("الكل")]];
const ORDER_STATUS = [["", tr("كل الطلبات")], ["served", tr("مُقدّمة")], ["ready", tr("جاهزة")], ["preparing", tr("قيد التحضير")], ["cancelled", tr("ملغاة")]];
const ACCOUNT_LABELS = { sales: tr("حساب المبيعات"), cash: tr("حساب الصندوق (نقدًا)"), bank: tr("حساب البنك"), electronic: tr("حساب الدفع الإلكتروني"), tax: tr("حساب الضريبة"), discount: tr("حساب الحسومات"), customer: tr("حساب الزبائن") };

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldClasses(false)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export default function AccountingExports() {
  const { canAny, can } = usePermissions();
  const toast = useToast();
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const types = TYPES.filter((t) => canAny(t.permission));
  const [type, setType] = useState(types[0]?.value || "invoices");
  const [range, setRange] = useState("this_month");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [filters, setFilters] = useState({ payment_method: "", payment_status: "", invoice_status: "paid", cashier_id: "", category: "", order_status: "" });
  const [downloading, setDownloading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAccountingSettings().then((data) => { setMeta(data); setSettings(data.settings); }).catch(setError);
  }, []);

  const current = TYPES.find((t) => t.value === type) || TYPES[0];
  const params = useMemo(() => {
    const p = { format: "xlsx", range };
    if (range === "custom") Object.assign(p, custom);
    current.filters.forEach((f) => { if (filters[f]) p[f] = filters[f]; });
    return p;
  }, [range, custom, filters, current]);

  const chips = [
    RANGES.find(([v]) => v === range)?.[1] + (range === "custom" && custom.from ? `: ${custom.from} ← ${custom.to || tr("اليوم")}` : ""),
    ...current.filters.filter((f) => filters[f]).map((f) => ({
      payment_method: METHODS, payment_status: PAY_STATUS, invoice_status: INVOICE_STATUS, order_status: ORDER_STATUS,
    }[f]?.find(([v]) => v === filters[f])?.[1] || (f === "cashier_id" ? meta?.cashiers?.find((c) => String(c.id) === filters[f])?.name : filters[f]))),
  ].filter(Boolean);

  async function handleExport() {
    if (range === "custom" && (!custom.from || !custom.to)) { toast.error(tr("حدّد تاريخ البداية والنهاية.")); return; }
    setDownloading(true);
    try {
      const { rows } = await downloadExport(type, params);
      toast.success(rows ? tr("نُزّل الملف ({0} سطرًا).", { 0: rows }) : tr("نُزّل الملف، ولا توجد بيانات في هذه الفترة."));
    } catch (err) {
      toast.error(errorText(err, tr("تعذّر إنشاء الملف.")));
    } finally {
      setDownloading(false);
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await saveAccountingSettings({ ...settings, tax_rate: Number(settings.tax_rate) || 0 });
      setSettings(saved);
      toast.success(tr("حُفظت إعدادات المحاسبة."));
      getAccountingSettings().then(setMeta).catch(() => {});
    } catch (err) {
      toast.error(errorText(err, tr("تعذّر حفظ الإعدادات.")));
    } finally {
      setSaving(false);
    }
  }

  const setFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
  const profile = meta?.profiles?.find((p) => p.key === (settings?.profile || "generic"));
  const columns = meta?.exports?.[type]?.columns || [];

  return (
    <div className="space-y-6">
      <PageHeader title={tr("المحاسبة والتصدير")} subtitle={tr("نزّل الفواتير والمدفوعات والتقارير كملفات Excel لإدخالها في برنامج المحاسبة.")} />

      {error && <Alert tone="danger">{errorText(error, tr("تعذّر تحميل إعدادات المحاسبة."))}</Alert>}
      {profile && !profile.verified && (
        <Alert tone="warning" title={tr("قالب الأصيل الذهبي مسودة غير متحقق منها")}>
          {tr("أسماء الأعمدة مؤقتة. قبل الاستيراد، طابقها مع قالب الاستيراد الفعلي في نسختك من الأصيل الذهبي، ويمكن تعديلها من إعدادات المحاسبة.")}
        </Alert>
      )}

      <Card>
        <CardHeader title={tr("تصدير تقرير")} description={current.hint} />
        <div className="space-y-5 p-5">
          <div>
            <p className="mb-2 text-sm font-bold">{tr("نوع التقرير")}</p>
            <SegmentedControl label={tr("نوع التقرير")} value={type} onChange={setType} options={types.map(({ value, label }) => ({ value, label }))} />
          </div>
          <div>
            <p className="mb-2 text-sm font-bold">{tr("الفترة")}</p>
            <SegmentedControl label={tr("الفترة")} value={range} onChange={setRange} options={RANGES.map(([value, label]) => ({ value, label }))} />
            {range === "custom" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input label={tr("من التاريخ")} type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
                <Input label={tr("إلى التاريخ")} type="date" value={custom.to} min={custom.from || undefined} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
              </div>
            )}
          </div>

          {current.filters.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {current.filters.includes("payment_method") && <Select label={tr("طريقة الدفع")} value={filters.payment_method} onChange={setFilter("payment_method")} options={METHODS} />}
              {current.filters.includes("payment_status") && <Select label={tr("حالة الدفع")} value={filters.payment_status} onChange={setFilter("payment_status")} options={PAY_STATUS} />}
              {current.filters.includes("invoice_status") && <Select label={tr("الفواتير")} value={filters.invoice_status} onChange={setFilter("invoice_status")} options={INVOICE_STATUS} />}
              {current.filters.includes("order_status") && <Select label={tr("حالة الطلب")} value={filters.order_status} onChange={setFilter("order_status")} options={ORDER_STATUS} />}
              {current.filters.includes("cashier_id") && <Select label={tr("الكاشير")} value={filters.cashier_id} onChange={setFilter("cashier_id")} options={[["", tr("الكل")], ...(meta?.cashiers || []).map((c) => [String(c.id), c.name])]} />}
              {current.filters.includes("category") && <Select label={tr("التصنيف")} value={filters.category} onChange={setFilter("category")} options={[["", tr("كل التصنيفات")], ...(meta?.categories || []).map((c) => [c, c])]} />}
            </div>
          )}

          <div className="rounded-xl bg-surface-2 p-4">
            <p className="text-xs font-bold text-muted">{tr("سيُصدَّر:")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="brand">{current.label}</Badge>
              {chips.map((c) => <Badge key={c} tone="neutral">{c}</Badge>)}
            </div>
            {!meta ? <Skeleton className="mt-3 h-4 w-2/3" /> : (
              <p className="mt-3 text-xs leading-6 text-muted">{tr("الأعمدة:")} {columns.map((c) => c.header).join(tr("، "))}</p>
            )}
          </div>

          <Button size="lg" onClick={handleExport} loading={downloading} disabled={!types.length}>
            {!downloading && <Download size={18} aria-hidden="true" />} {tr("تحميل Excel")}
          </Button>
        </div>
      </Card>

      {can("manage_accounting_settings") && settings && (
        <Card as="form" onSubmit={handleSave}>
          <CardHeader title={tr("إعدادات المحاسبة")} description={tr("تخص مطعمك فقط. رموز الحسابات تظهر في عمود «رمز الحساب» عند التصدير.")} action={<Settings2 size={18} className="text-muted" aria-hidden="true" />} />
          <div className="space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Select label={tr("قالب التصدير")} value={settings.profile} onChange={(v) => setSettings((s) => ({ ...s, profile: v }))} options={(meta?.profiles || []).map((p) => [p.key, p.label])} />
              <Input label={tr("العملة")} dir="ltr" maxLength={10} value={settings.currency} onChange={(e) => setSettings((s) => ({ ...s, currency: e.target.value }))} />
              <Input label={tr("بادئة رقم الفاتورة")} dir="ltr" maxLength={20} value={settings.invoice_prefix} onChange={(e) => setSettings((s) => ({ ...s, invoice_prefix: e.target.value }))} hint={tr("مثال: INV-000123")} />
              <Input label={tr("نسبة الضريبة %")} type="number" min="0" max="100" step="0.01" value={settings.tax_rate} onChange={(e) => setSettings((s) => ({ ...s, tax_rate: e.target.value }))} />
            </div>
            <label className="flex items-center gap-3 text-sm font-bold">
              <input type="checkbox" className="h-4 w-4 accent-[var(--color-copper)]" checked={settings.prices_include_tax} onChange={(e) => setSettings((s) => ({ ...s, prices_include_tax: e.target.checked }))} />
              {tr("أسعار المنيو تشمل الضريبة")}
            </label>

            <fieldset>
              <legend className="mb-3 text-sm font-extrabold">{tr("رموز الحسابات")}</legend>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(meta?.account_keys || []).map((key) => (
                  <Input key={key} label={ACCOUNT_LABELS[key] || key} dir="ltr" maxLength={32} value={settings.accounts?.[key] || ""}
                    onChange={(e) => setSettings((s) => ({ ...s, accounts: { ...s.accounts, [key]: e.target.value } }))} />
                ))}
              </div>
            </fieldset>

            {(meta?.categories || []).length > 0 && (
              <fieldset>
                <legend className="mb-1 text-sm font-extrabold">{tr("حساب لكل تصنيف (اختياري)")}</legend>
                <p className="mb-3 text-xs text-muted">{tr("إذا تُرك فارغًا يُستخدم حساب المبيعات.")}</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {meta.categories.map((cat) => (
                    <Input key={cat} label={cat} dir="ltr" maxLength={32} value={settings.category_accounts?.[cat] || ""}
                      onChange={(e) => setSettings((s) => ({ ...s, category_accounts: { ...s.category_accounts, [cat]: e.target.value } }))} />
                  ))}
                </div>
              </fieldset>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
              <p className="flex items-center gap-1.5 text-xs text-muted"><AlertTriangle size={14} aria-hidden="true" /> {tr("أسماء الأعمدة المخصصة تُضبط عبر الـ API (راجع دليل التصدير المحاسبي).")}</p>
              <Button type="submit" loading={saving}><FileSpreadsheet size={16} aria-hidden="true" /> {tr("حفظ الإعدادات")}</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
