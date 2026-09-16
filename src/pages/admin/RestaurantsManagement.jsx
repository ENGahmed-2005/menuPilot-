import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, RefreshCw, Search, XCircle } from "lucide-react";
import { getAllRestaurants, overrideRestaurantPlan } from "../../api/admin";
import AdminPageShell from "../../components/layout/AdminPageShell";

const labels = { basic: "Basic", pro: "Pro", premium: "Premium", trial: "Trial" };
const activePlan = p => p === "trial" || ["basic", "pro", "premium"].includes(p);

export default function RestaurantsManagement() {
  const [rows, setRows] = useState([]), [query, setQuery] = useState(""), [loading, setLoading] = useState(true), [busy, setBusy] = useState(null), [error, setError] = useState(""), [success, setSuccess] = useState("");
  async function load() { setLoading(true); setError(""); try { setRows(await getAllRestaurants() || []); } catch (e) { setError(e.message || "تعذر تحميل المطاعم"); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => rows.filter(r => `${r.restaurant_name || ""} ${r.email || ""} ${r.restaurant_phone || ""}`.toLowerCase().includes(query.toLowerCase())), [rows, query]);
  async function changePlan(id, plan) { setBusy(id); setError(""); setSuccess(""); try { const updated = await overrideRestaurantPlan(id, plan); setRows(xs => xs.map(x => x.id === id ? { ...x, ...updated } : x)); setSuccess("تم تحديث المطعم بنجاح."); } catch (e) { setError(e.message || "تعذر تحديث الباقة"); } finally { setBusy(null); } }
  return <AdminPageShell title="المطاعم"><section className="admin-heading"><div><p className="admin-overline"><Building2 size={14} /> إدارة بيانات المنصة</p><h1>المطاعم</h1><p>كل المطاعم المسجلة فعليًا في menuPilot مع حالة الحساب والباقة.</p></div><button className="admin-primary-button" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> تحديث</button></section>
    {error && <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: "#fff0eb", color: "#bd725c", fontSize: 11, fontWeight: 700 }}>{error}</div>}{success && <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: "#f1fbf4", color: "#3e9b75", fontSize: 11, fontWeight: 700 }}>{success}</div>}
    <section className="admin-table-card"><div className="admin-toolbar"><div className="admin-search"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث باسم المطعم أو البريد..."/>{query && <button onClick={() => setQuery("")}><XCircle size={15}/></button>}</div><span>{filtered.length} من {rows.length} مطعم</span></div><div className="admin-table-wrapper"><table className="admin-table"><thead><tr><th>المطعم</th><th>البريد</th><th>الهاتف</th><th>الباقة</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>{filtered.map(r => <tr key={r.id}><td><strong>{r.restaurant_name || "بدون اسم"}</strong></td><td>{r.email}</td><td>{r.restaurant_phone || "—"}</td><td><span className="admin-plan">{labels[r.plan] || r.plan}</span></td><td><span className={`admin-status ${activePlan(r.plan) ? "active" : "inactive"}`}><i />{activePlan(r.plan) ? "نشط" : "غير نشط"}</span></td><td><select value={r.plan} disabled={busy === r.id || r.plan === "trial"} onChange={e => changePlan(r.id, e.target.value)} style={{ border: 0, borderRadius: 7, padding: "7px 9px", background: "#f0f1ff", fontSize: 10, fontWeight: 700 }}><option value="trial">Trial</option><option value="basic">Basic</option><option value="pro">Pro</option><option value="premium">Premium</option></select></td></tr>)}</tbody></table>{loading && <div className="admin-empty">جارٍ تحميل المطاعم...</div>}{!loading && !filtered.length && <div className="admin-empty">لا توجد مطاعم مطابقة.</div>}</div></section>
  </AdminPageShell>;
}
