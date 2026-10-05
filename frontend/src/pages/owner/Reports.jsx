import { useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle2, Clock3, DollarSign, Package, RefreshCw, XCircle } from "lucide-react";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import { api } from "../../api/client";
import { t, dir, locale } from "../../i18n";

const periods = [{ value: 7, label: t("7 أيام") }, { value: 30, label: t("30 يومًا") }, { value: 90, label: t("90 يومًا") }];
const money = (value) => `${Number(value || 0).toFixed(2)} ₪`;
const dateLabel = (value) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(value));

function Stat({ icon: Icon, title, value, note }) {
  return <Card className="p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-muted">{title}</p><strong className="mt-2 block text-2xl font-bold text-ink">{value}</strong>{note && <span className="mt-1 block text-xs text-muted">{note}</span>}</div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink/5 text-ink-soft"><Icon size={19} /></span></div></Card>;
}

export default function Reports() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReports(selectedDays = days) {
    setLoading(true); setError("");
    try { setData(await api.get(`/owner/reports/sales-trend?days=${selectedDays}`)); }
    catch (err) { setError(err.message || t("تعذر تحميل التقارير")); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadReports(); }, [days]);
  const maxRevenue = useMemo(() => Math.max(...(data?.trend || []).map((item) => Number(item.revenue || 0)), 1), [data]);
  const maxOrders = useMemo(() => Math.max(...(data?.trend || []).map((item) => Number(item.orders || 0)), 1), [data]);
  const summary = data?.summary || {};

  return <div dir={dir}>
    <PageHeader title={t("تقارير المبيعات")} subtitle={t("تابع الطلبات والإيرادات وأفضل الأصناف في مطعمك.")} />
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2 rounded-xl bg-ink/5 p-1">{periods.map((period) => <button key={period.value} type="button" onClick={() => setDays(period.value)} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${days === period.value ? "bg-white text-ink shadow-sm" : "text-muted"}`}>{period.label}</button>)}</div>
      <button type="button" onClick={() => loadReports()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-ink/10 px-4 py-2 text-sm font-medium text-ink-soft disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> {t("تحديث")}</button>
    </div>
    {error && <Card className="mb-6 border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}
    {loading && !data ? <Card className="flex min-h-72 items-center justify-center p-8 text-sm text-muted">{t("جارٍ تحميل بيانات التقارير...")}</Card> : <>
      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={DollarSign} title={t("الإيرادات")} value={money(summary.revenue)} note={t("خلال آخر {0} يوم", { 0: days })} />
        <Stat icon={Package} title={t("إجمالي الطلبات")} value={summary.totalOrders || 0} note={t("{0} دفعة مؤكدة", { 0: summary.paymentsCount || 0 })} />
        <Stat icon={CheckCircle2} title={t("الطلبات المكتملة")} value={summary.completedOrders || 0} note={t("تم تقديمها بنجاح")} />
        <Stat icon={Clock3} title={t("متوسط الطلب")} value={money(summary.averageOrder)} note={t("{0} طلب قيد التنفيذ", { 0: summary.pendingOrders || 0 })} />
      </section>
      <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <Card className="p-6"><div className="mb-6 flex items-center justify-between"><div><h2 className="font-semibold text-ink">{t("اتجاه الإيرادات")}</h2><p className="mt-1 text-xs text-muted">{t("الإيرادات اليومية خلال الفترة المحددة")}</p></div><BarChart3 size={20} className="text-muted" /></div>
          <div className="flex h-64 items-end gap-1 overflow-hidden border-b border-ink/10">{(data?.trend || []).map((item) => <div key={item.date} className="group flex h-full min-w-[10px] flex-1 flex-col justify-end" title={`${dateLabel(item.date)}: ${money(item.revenue)}`}><div className="w-full rounded-t bg-ink/30 transition group-hover:bg-ink/50" style={{ height: `${Math.max((Number(item.revenue) / maxRevenue) * 100, item.revenue ? 4 : 1)}%` }} /></div>)}</div>
          <div className="mt-3 flex justify-between text-xs text-muted"><span>{data?.period?.from}</span><span>{data?.period?.to}</span></div>
        </Card>
        <Card className="p-6"><h2 className="font-semibold text-ink">{t("الطلبات اليومية")}</h2><p className="mb-5 mt-1 text-xs text-muted">{t("حجم الطلبات خلال الفترة")}</p><div className="space-y-3">{(data?.trend || []).slice(-7).map((item) => <div key={item.date}><div className="mb-1 flex justify-between text-xs"><span>{dateLabel(item.date)}</span><strong>{item.orders}</strong></div><div className="h-2 overflow-hidden rounded-full bg-ink/5"><div className="h-full rounded-full bg-ink/35" style={{ width: `${(Number(item.orders) / maxOrders) * 100}%` }} /></div></div>)}{!data?.trend?.length && <p className="py-10 text-center text-sm text-muted">{t("لا توجد طلبات في هذه الفترة.")}</p>}</div></Card>
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-6"><h2 className="mb-5 font-semibold text-ink">{t("الأصناف الأكثر طلبًا")}</h2><div className="space-y-4">{(data?.topItems || []).map((item, index) => <div key={`${item.name}-${index}`} className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-xs font-bold text-ink-soft">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="text-xs text-muted">{item.quantity} {t("طلب")}</p></div><strong className="text-sm">{money(item.revenue)}</strong></div>)}{!data?.topItems?.length && <p className="py-8 text-center text-sm text-muted">{t("لا توجد بيانات أصناف بعد.")}</p>}</div></Card>
        <Card className="p-6"><h2 className="mb-5 font-semibold text-ink">{t("حالة الطلبات")}</h2><div className="space-y-4"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm"><CheckCircle2 size={16} /> {t("مكتملة")}</span><strong>{summary.completedOrders || 0}</strong></div><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm"><Clock3 size={16} /> {t("قيد التنفيذ")}</span><strong>{summary.pendingOrders || 0}</strong></div><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm"><XCircle size={16} /> {t("ملغاة")}</span><strong>{summary.cancelledOrders || 0}</strong></div></div></Card>
      </section>
    </>}
  </div>;
}
