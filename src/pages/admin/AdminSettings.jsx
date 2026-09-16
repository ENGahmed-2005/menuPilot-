import { useEffect, useState } from "react";
import { Bell, Check, Globe2, Settings, ShieldCheck } from "lucide-react";
import AdminPageShell from "../../components/layout/AdminPageShell";

export default function AdminSettings() {
  const [settings, setSettings] = useState(() => { try { return JSON.parse(localStorage.getItem("menupilot_admin_settings") || "null") || { maintenance: false, emailAlerts: true, compact: false }; } catch { return { maintenance: false, emailAlerts: true, compact: false }; } });
  const [saved, setSaved] = useState(false);
  useEffect(() => { localStorage.setItem("menupilot_admin_settings", JSON.stringify(settings)); }, [settings]);
  function update(key) { setSettings(s => ({ ...s, [key]: !s[key] })); setSaved(false); }
  function save() { localStorage.setItem("menupilot_admin_settings", JSON.stringify(settings)); setSaved(true); setTimeout(() => setSaved(false), 2200); }
  return <AdminPageShell title="الإعدادات"><section className="admin-heading"><div><p className="admin-overline"><Settings size={14} /> إعدادات لوحة الإدارة</p><h1>الإعدادات</h1><p>تحكم بإعدادات واجهة المسؤول والتنبيهات المحلية دون الرجوع إلى التصميم القديم.</p></div></section>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
      <section className="admin-table-card" style={{ padding: 24 }}><div className="admin-table-heading" style={{ padding: 0, border: 0 }}><div><p>النظام</p><h2>إعدادات المنصة</h2></div><ShieldCheck size={25} /></div><div style={{ marginTop: 20, display: "grid", gap: 14 }}>
        <label style={{ display: "flex", justifyContent: "space-between", gap: 15, alignItems: "center", padding: 14, borderRadius: 12, background: "#faf9f6" }}><span><b>وضع الصيانة</b><small style={{ display: "block", marginTop: 4, color: "#999" }}>تفعيل حالة الصيانة للوحة مستقبلًا.</small></span><input type="checkbox" checked={settings.maintenance} onChange={() => update("maintenance")} /></label>
        <label style={{ display: "flex", justifyContent: "space-between", gap: 15, alignItems: "center", padding: 14, borderRadius: 12, background: "#faf9f6" }}><span><b>تنبيهات البريد</b><small style={{ display: "block", marginTop: 4, color: "#999" }}>تفضيل عرض تنبيهات الإدارة.</small></span><input type="checkbox" checked={settings.emailAlerts} onChange={() => update("emailAlerts")} /></label>
        <label style={{ display: "flex", justifyContent: "space-between", gap: 15, alignItems: "center", padding: 14, borderRadius: 12, background: "#faf9f6" }}><span><b>عرض مضغوط</b><small style={{ display: "block", marginTop: 4, color: "#999" }}>تقليل المسافات في الجداول.</small></span><input type="checkbox" checked={settings.compact} onChange={() => update("compact")} /></label>
      </div></section>
      <section className="admin-table-card" style={{ padding: 24 }}><div className="admin-table-heading" style={{ padding: 0, border: 0 }}><div><p>المنصة</p><h2>معلومات الاتصال</h2></div><Globe2 size={25} /></div><div style={{ marginTop: 20, display: "grid", gap: 12 }}><div className="admin-plan">API: http://127.0.0.1:8000/api</div><div className="admin-plan">قاعدة البيانات: MySQL / menupilot</div><div className="admin-plan">لوحة الإدارة: Connected</div></div></section>
    </div>
    <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12 }}><button className="admin-primary-button" onClick={save}><Check size={15} /> حفظ الإعدادات</button>{saved && <span style={{ color: "#3e9c76", fontSize: 11, fontWeight: 800 }}>تم الحفظ</span>}</div>
  </AdminPageShell>;
}
