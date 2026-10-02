import { useEffect, useMemo, useState } from "react";
import { Pencil, RefreshCw, Search, UserRound, X } from "lucide-react";
import { api } from "../../api/client";
import AdminPageShell from "../../components/layout/AdminPageShell";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { t } from "../../i18n";

export default function OwnersManagement() {
  const [owners, setOwners] = useState([]), [query, setQuery] = useState(""), [modal, setModal] = useState(null), [form, setForm] = useState({ name: "", email: "", restaurant_name: "", restaurant_phone: "" }), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(""), [success, setSuccess] = useState("");
  async function load() { setLoading(true); setError(""); try { setOwners(await api.get("/admin/restaurants") || []); } catch (e) { setError(e.message || t("تعذر تحميل المستخدمين")); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => owners.filter(o => `${o.name || ""} ${o.email || ""} ${o.restaurant_name || ""}`.toLowerCase().includes(query.toLowerCase())), [owners, query]);
  function openEdit(owner) { setSuccess(""); setError(""); setForm({ name: owner.name || "", email: owner.email || "", restaurant_name: owner.restaurant_name || "", restaurant_phone: owner.restaurant_phone || "" }); setModal(owner); }
  // Disabling an owner blocks the owner AND their staff immediately (API-enforced).
  const [confirm, confirmDialog] = useConfirm();
  const [statusBusy, setStatusBusy] = useState(null);
  async function toggleStatus(owner) {
    const disabling = owner.is_active !== false;
    if (disabling && !(await confirm({
      title: t("تعطيل حساب {0}؟", { 0: owner.restaurant_name || owner.name }),
      description: t("لن يستطيع صاحب المطعم ولا موظفوه تسجيل الدخول أو استخدام النظام حتى تعيد التفعيل. تبقى كل البيانات محفوظة."),
      confirmLabel: t("تعطيل الحساب"),
      tone: "danger",
    }))) return;
    setStatusBusy(owner.id); setError("");
    try {
      const updated = await api.patch(`/admin/owners/${owner.id}/status`, { active: !disabling });
      setOwners((xs) => xs.map((x) => (x.id === owner.id ? { ...x, is_active: updated?.is_active ?? !disabling } : x)));
    } catch (e) { setError(e.message || t("تعذّر تغيير حالة الحساب")); } finally { setStatusBusy(null); }
  }

  async function save(e) { e.preventDefault(); if (!modal) return; setSaving(true); setError(""); try { const updated = await api.patch(`/admin/owners/${modal.id}`, form); setOwners(xs => xs.map(x => x.id === modal.id ? { ...x, ...updated } : x)); setModal(null); setSuccess(t("تم حفظ بيانات المستخدم والمطعم.")); } catch (e) { setError(e.message || t("تعذر حفظ التعديلات")); } finally { setSaving(false); } }
  return <AdminPageShell title={t("المستخدمون")}>{confirmDialog}<section className="admin-heading"><div><p className="admin-overline"><UserRound size={14} /> {t("إدارة الحسابات")}</p><h1>{t("المستخدمون")}</h1><p>{t("إدارة أصحاب المطاعم وبيانات حساباتهم مباشرة من بيانات المنصة.")}</p></div><button className="admin-primary-button" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> {t("تحديث")}</button></section>
    {error && <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: "#fff0eb", color: "#bd725c", fontSize: 11, fontWeight: 700 }}>{error}</div>}{success && <div style={{ marginBottom: 14, padding: 12, borderRadius: 10, background: "#f1fbf4", color: "#3e9b75", fontSize: 11, fontWeight: 700 }}>{success}</div>}
    <section className="admin-table-card"><div className="admin-toolbar"><div className="admin-search"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t("ابحث بالاسم أو البريد أو المطعم...")}/></div><span>{filtered.length} {t("مستخدم")}</span></div><div className="admin-table-wrapper"><table className="admin-table"><thead><tr><th>{t("المستخدم")}</th><th>{t("المطعم")}</th><th>{t("الهاتف")}</th><th>{t("الباقة")}</th><th>{t("الحالة")}</th><th>{t("إجراء")}</th></tr></thead><tbody>{filtered.map(o => <tr key={o.id}><td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="admin-stat-icon orange" style={{ width: 34, height: 34 }}><UserRound size={16}/></span><div><strong>{o.name || t("بدون اسم")}</strong><small style={{ display: "block", marginTop: 3, color: "#999" }}>{o.email}</small></div></div></td><td>{o.restaurant_name || "—"}</td><td>{o.restaurant_phone || "—"}</td><td><span className="admin-plan">{o.plan || "—"}</span></td><td><span className={`admin-status ${o.is_active === false ? "inactive" : "active"}`}><i />{o.is_active === false ? t("معطّل") : t("نشط")}</span></td><td><div className="admin-actions"><button className="admin-edit" onClick={() => openEdit(o)}><Pencil size={14}/> {t("تعديل")}</button><button className={o.is_active === false ? "admin-enable" : "admin-disable"} disabled={statusBusy === o.id} onClick={() => toggleStatus(o)}>{o.is_active === false ? t("تفعيل") : t("تعطيل")}</button></div></td></tr>)}</tbody></table>{loading && <div className="admin-empty">{t("جارٍ تحميل المستخدمين...")}</div>}{!loading && !filtered.length && <div className="admin-empty">{t("لا توجد نتائج مطابقة.")}</div>}</div></section>
    {modal && <div className="admin-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setModal(null)}><form className="admin-modal" onSubmit={save}><div className="admin-modal-header"><div><small>{t("تعديل الحساب")}</small><h2>{t("بيانات المستخدم والمطعم")}</h2></div><button type="button" onClick={() => setModal(null)}><X size={19}/></button></div><div className="admin-modal form" style={{ padding: "20px 24px 24px" }}><label>{t("اسم المستخدم")}<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label><label>{t("البريد الإلكتروني")}<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label><label>{t("اسم المطعم")}<input value={form.restaurant_name} onChange={e => setForm({ ...form, restaurant_name: e.target.value })}/></label><label>{t("هاتف المطعم")}<input value={form.restaurant_phone} onChange={e => setForm({ ...form, restaurant_phone: e.target.value })}/></label><div className="admin-modal-actions"><button type="button" onClick={() => setModal(null)}>{t("إلغاء")}</button><button type="submit" disabled={saving}>{saving ? t("جارٍ الحفظ...") : t("حفظ التعديلات")}</button></div></div></form></div>}
  </AdminPageShell>;
}
