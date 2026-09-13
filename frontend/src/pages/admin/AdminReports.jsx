import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Building2, CalendarDays, CheckCircle2, CircleDollarSign, ClipboardList, RefreshCw, TrendingUp, Users, XCircle } from "lucide-react";
import { api } from "../../api/client";
import "./AdminDashboard.css";

const money = (value) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
const dateLabel = (value) => new Intl.DateTimeFormat("ar", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));

function Metric({ title, value, note, icon: Icon, color }) {
  return <div className="admin-stat-card"><div className={`admin-stat-icon ${color}`}><Icon size={22} /></div><div><p>{title}</p><strong>{value}</strong><small>{note}</small></div></div>;
}

export default function AdminReports() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { setReport(await api.get(`/admin/reports?days=${days}`)); }
    catch (e) { setError(e.message || "تعذر تحميل التقارير"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [days]);

  const trend = report?.trend || [];
  const maxOrders = useMemo(() => Math.max(1, ...trend.map(x => Number(x.orders || 0))), [trend]);
  const maxRevenue = useMemo(() => Math.max(1, ...trend.map(x => Number(x.revenue || 0))), [trend]);
  const planTotal = useMemo(() => (report?.plans || []).reduce((sum, x) => sum + Number(x.count || 0), 0), [report]);

  if (loading && !report) return <div className="admin-dashboard" dir="rtl"><main className="admin-main" style={{ width: "100%", margin: 0 }}><div className="admin-content"><div className="admin-empty">جارٍ تحميل التقارير...</div></div></main></div>;

  return <div className="admin-dashboard" dir="rtl"><main className="admin-main" style={{ width: "100%", margin: 0 }}>
    <div className="admin-content">
      <section className="admin-heading"><div><p className="admin-overline"><Activity size={14} /> تحليلات المنصة</p><h1>التقارير والإحصائيات</h1><p>ملخص أداء menuPilot من المطاعم والطلبات والمدفوعات.</p></div><div style={{ display: "flex", gap: 8, alignItems: "center" }}><select value={days} onChange={e => setDays(Number(e.target.value))} className="admin-modal input" style={{ width: 120, padding: "10px 12px", border: "1px solid #e2e0d8", borderRadius: 9, background: "#fff", fontSize: 11 }}><option value={7}>7 أيام</option><option value={30}>30 يومًا</option><option value={90}>90 يومًا</option><option value={365}>سنة</option></select><button className="admin-primary-button" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> تحديث</button></div></section>
      {error && <div style={{ marginBottom: 20, padding: 12, borderRadius: 10, background: "#fff0eb", color: "#bd725c", fontSize: 11, fontWeight: 700 }}>{error}</div>}

      <section className="admin-stats-grid">
        <Metric title="إيرادات الفترة" value={money(report?.revenue?.revenue)} icon={CircleDollarSign} color="green" note={`${report?.revenue?.paymentsCount || 0} عملية دفع`} />
        <Metric title="إجمالي الطلبات" value={report?.orders?.totalOrders || 0} icon={ClipboardList} color="blue" note={`${report?.orders?.completedOrders || 0} طلب مكتمل`} />
        <Metric title="المطاعم النشطة" value={report?.restaurants?.activeRestaurants || 0} icon={Building2} color="orange" note={`من أصل ${report?.restaurants?.totalRestaurants || 0}`} />
        <Metric title="متوسط الدفع" value={money(report?.revenue?.averagePayment)} icon={TrendingUp} color="purple" note="متوسط قيمة العملية" />
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(280px,1fr)", gap: 18 }}>
        <section className="admin-table-card"><div className="admin-table-heading"><div><p>النشاط اليومي</p><h2>الطلبات والإيرادات</h2></div><span className="admin-live"><i /> بيانات حقيقية</span></div><div style={{ padding: "5px 24px 25px" }}>
          {trend.length === 0 ? <div className="admin-empty">لا توجد بيانات في الفترة المحددة</div> : <div style={{ display: "grid", gap: 8 }}>{trend.map(item => <div key={item.date} style={{ display: "grid", gridTemplateColumns: "75px 1fr 85px", gap: 10, alignItems: "center", fontSize: 9, color: "#8c8d83" }}><span>{dateLabel(item.date)}</span><div style={{ position: "relative", height: 24, borderRadius: 6, background: "#f6f3ed", overflow: "hidden" }}><div style={{ width: `${Math.max(3, Number(item.orders) / maxOrders * 100)}%`, height: "100%", borderRadius: 6, background: "#edf2ff" }} /><span style={{ position: "absolute", right: 8, top: 6, color: "#5e77cf", fontWeight: 800 }}>{item.orders} طلب</span></div><strong style={{ color: "#3e9c76", textAlign: "left" }}>{money(item.revenue)}</strong></div>)}</div>}
        </div></section>

        <section className="admin-table-card"><div className="admin-table-heading"><div><p>توزيع الباقات</p><h2>الاشتراكات</h2></div></div><div style={{ padding: "0 24px 25px" }}>{(report?.plans || []).map(item => <div key={item.plan} style={{ marginBottom: 15 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, color: "#68736b" }}><span>{item.plan}</span><span>{item.count}</span></div><div style={{ marginTop: 6, height: 8, borderRadius: 99, background: "#f1f0eb", overflow: "hidden" }}><div style={{ width: `${planTotal ? item.count / planTotal * 100 : 0}%`, height: "100%", borderRadius: 99, background: "#e58a52" }} /></div></div>)}{!report?.plans?.length && <div className="admin-empty">لا توجد بيانات</div>}</div></section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 18 }}>
        <section className="admin-table-card"><div className="admin-table-heading"><div><p>حالة الطلبات</p><h2>الأداء التشغيلي</h2></div></div><div style={{ padding: "0 24px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Metric title="مكتملة" value={report?.orders?.completedOrders || 0} icon={CheckCircle2} color="green" note="خلال الفترة" /><Metric title="قيد التنفيذ" value={report?.orders?.pendingOrders || 0} icon={ClipboardList} color="blue" note="Pending / Preparing / Ready" /><Metric title="ملغاة" value={report?.orders?.cancelledOrders || 0} icon={XCircle} color="orange" note="خلال الفترة" /><Metric title="تجارب مجانية" value={report?.restaurants?.trialRestaurants || 0} icon={CalendarDays} color="purple" note="Trial" />
        </div></section>

        <section className="admin-table-card"><div className="admin-table-heading"><div><p>الأداء الأعلى</p><h2>أفضل المطاعم بالإيرادات</h2></div></div><div className="admin-table-wrapper"><table className="admin-table"><thead><tr><th>المطعم</th><th>المدفوعات</th><th>الإيرادات</th></tr></thead><tbody>{(report?.topRestaurants || []).map(r => <tr key={r.id}><td><strong>{r.restaurant_name || "بدون اسم"}</strong></td><td>{r.payments}</td><td className="admin-revenue">{money(r.revenue)}</td></tr>)}</tbody></table>{!report?.topRestaurants?.length && <div className="admin-empty">لا توجد مدفوعات في الفترة المحددة</div>}</div></section>
      </div>

      <section className="admin-table-card" style={{ marginTop: 18 }}><div className="admin-table-heading"><div><p>ملخص سريع</p><h2>مؤشرات الفترة</h2></div><span style={{ fontSize: 9, color: "#aaa99f" }}>{report?.period?.from} → {report?.period?.to}</span></div><div style={{ padding: "0 24px 22px", display: "flex", flexWrap: "wrap", gap: 10 }}><span className="admin-plan">{report?.restaurants?.paidRestaurants || 0} مطاعم مدفوعة</span><span className="admin-plan">{report?.restaurants?.trialRestaurants || 0} تجارب</span><span className="admin-plan">{report?.orders?.totalOrders || 0} طلب</span><span className="admin-plan">{report?.revenue?.paymentsCount || 0} دفعة</span><span className="admin-plan">{money(report?.revenue?.revenue)} إجمالي الإيرادات</span></div></section>
    </div>
  </main></div>;
}
