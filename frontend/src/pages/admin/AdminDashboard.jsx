import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Activity, BarChart3, Bell, Building2, CalendarPlus, ChevronDown, FileText, LayoutDashboard, Menu, Search, Settings, Store, Users, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../api/client";
import "./AdminDashboard.css";

const menuItems = [
  { label: "لوحة التحكم", icon: LayoutDashboard, to: "/admin/dashboard" },
  { label: "المطاعم", icon: Store, to: "/admin/restaurants" },
  { label: "المستخدمون", icon: Users, to: "/admin/owners" },
  { label: "الاشتراكات", icon: FileText, to: "/admin/restaurants" },
  { label: "التقارير", icon: BarChart3, to: "/admin/dashboard" },
];

const planLabels = { basic: "Basic", pro: "Pro", premium: "Premium", trial: "Trial" };
const planOptions = ["basic", "pro", "premium"];

function formatDate(value) {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function StatCard({ title, value, icon: Icon, color, note }) {
  return <div className="admin-stat-card"><div className={`admin-stat-icon ${color}`}><Icon size={22} /></div><div><p>{title}</p><strong>{value}</strong><small>{note}</small></div></div>;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState("");
  const [trialModal, setTrialModal] = useState(null);
  const [trialDays, setTrialDays] = useState(14);

  async function loadRestaurants() {
    setLoading(true);
    try {
      const data = await api.get("/admin/restaurants");
      setRestaurants(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(error.message || "تعذر تحميل بيانات المطاعم");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRestaurants(); }, []);

  const filteredRestaurants = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return restaurants;
    return restaurants.filter((restaurant) => `${restaurant.restaurant_name || ""} ${restaurant.email || ""} ${restaurant.plan || ""}`.toLowerCase().includes(query));
  }, [restaurants, search]);

  const activeRestaurants = restaurants.filter((r) => r.plan === "trial" || ["basic", "pro", "premium"].includes(r.plan)).length;
  const trialRestaurants = restaurants.filter((r) => r.plan === "trial").length;
  const premiumRestaurants = restaurants.filter((r) => r.plan === "premium").length;
  const paidRestaurants = restaurants.filter((r) => ["basic", "pro", "premium"].includes(r.plan)).length;

  async function changePlan(id, plan) {
    setSavingId(id); setMessage("");
    try {
      const data = await api.patch(`/admin/restaurants/${id}/plan`, { plan });
      setRestaurants((current) => current.map((r) => r.id === id ? { ...r, ...data } : r));
      setMessage("تم تحديث الباقة بنجاح.");
    } catch (error) {
      setMessage(error.message || "تعذر تحديث الباقة");
    } finally { setSavingId(null); }
  }

  async function extendTrial() {
    if (!trialModal) return;
    setSavingId(trialModal.id); setMessage("");
    try {
      const data = await api.post(`/admin/restaurants/${trialModal.id}/trial/extend`, { days: Number(trialDays) });
      setRestaurants((current) => current.map((r) => r.id === trialModal.id ? { ...r, ...data } : r));
      setTrialModal(null);
      setMessage(`تم تمديد التجربة ${trialDays} يومًا.`);
    } catch (error) {
      setMessage(error.message || "تعذر تمديد التجربة");
    } finally { setSavingId(null); }
  }

  return (
    <div className="admin-dashboard" dir="rtl">
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-brand"><div className="admin-logo">m</div><div><strong>menu<span>Pilot</span></strong><small>نظام إدارة المطاعم</small></div><button className="admin-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="إغلاق القائمة"><X size={20} /></button></div>
        <p className="admin-menu-title">القائمة الرئيسية</p>
        <nav className="admin-nav">{menuItems.map(({ label, icon: Icon, to }) => <NavLink key={label} to={to} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `admin-nav-item ${isActive ? "selected" : ""}`}><Icon size={19} /><span>{label}</span>{label === "المطاعم" && <em>{restaurants.length}</em>}</NavLink>)}</nav>
        <p className="admin-menu-title admin-account-title">إدارة الحساب</p>
        <nav className="admin-nav"><button className="admin-nav-item" onClick={() => navigate("/admin/dashboard")}><Settings size={19} /><span>الإعدادات</span></button><button className="admin-nav-item" onClick={() => navigate("/admin/dashboard")}><Bell size={19} /><span>الإشعارات</span></button></nav>
        <div className="admin-user-box"><div className="admin-user-avatar">{(user?.name || "م").charAt(0)}</div><div><strong>{user?.name || "مدير النظام"}</strong><small>{user?.email || "مدير النظام"}</small></div><ChevronDown size={16} /></div>
        <button className="admin-logout" onClick={logout}>تسجيل الخروج</button>
      </aside>
      {sidebarOpen && <button className="admin-overlay" onClick={() => setSidebarOpen(false)} aria-label="إغلاق القائمة" />}

      <main className="admin-main">
        <header className="admin-topbar"><button className="admin-mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="فتح القائمة"><Menu size={22} /></button><div className="admin-breadcrumb">الرئيسية <span>/</span> <b>لوحة التحكم</b></div><div className="admin-date"><Bell size={17} /> menuPilot Admin</div></header>
        <div className="admin-content">
          <section className="admin-heading"><div><p className="admin-overline"><Activity size={14} /> بيانات حقيقية من النظام</p><h1>لوحة تحكم المسؤول العام</h1><p>إدارة المطاعم والاشتراكات والتجارب مباشرة من قاعدة البيانات.</p></div><button className="admin-primary-button" onClick={loadRestaurants} disabled={loading}>{loading ? "جارٍ التحديث…" : "تحديث البيانات"}</button></section>

          <section className="admin-stats-grid">
            <StatCard title="إجمالي المطاعم" value={restaurants.length} icon={Building2} color="orange" note="من قاعدة البيانات" />
            <StatCard title="الحسابات النشطة" value={activeRestaurants} icon={Store} color="blue" note={`${paidRestaurants} باقات مدفوعة`} />
            <StatCard title="التجارب المجانية" value={trialRestaurants} icon={CalendarPlus} color="green" note="تحتاج متابعة" />
            <StatCard title="Premium" value={premiumRestaurants} icon={Users} color="purple" note="اشتراكات Premium" />
          </section>

          <section className="admin-table-card">
            <div className="admin-table-heading"><div><p>إدارة الحسابات</p><h2>المطاعم المسجلة فعليًا</h2></div><span className="admin-live"><i /> متصل بالباكند</span></div>
            <div className="admin-toolbar"><div className="admin-search"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم المطعم أو البريد..." />{search && <button onClick={() => setSearch("")} aria-label="مسح البحث"><X size={15} /></button>}</div><span>عرض {filteredRestaurants.length} من {restaurants.length} مطاعم</span></div>
            {message && <div style={{ margin: "0 24px 14px", padding: "10px 12px", borderRadius: 8, background: "#f1fbf4", color: "#3e9b75", fontSize: 11, fontWeight: 700 }}>{message}</div>}
            <div className="admin-table-wrapper">
              <table className="admin-table"><thead><tr><th>اسم المطعم</th><th>البريد الإلكتروني</th><th>الباقة</th><th>حالة الحساب</th><th>انتهاء التجربة</th><th>تاريخ الاشتراك</th><th>الإجراءات</th></tr></thead>
                <tbody>{filteredRestaurants.map((restaurant) => { const trial = restaurant.plan === "trial"; const active = trial || ["basic", "pro", "premium"].includes(restaurant.plan); return <tr key={restaurant.id}><td><strong>{restaurant.restaurant_name || "بدون اسم"}</strong></td><td>{restaurant.email}</td><td><select value={restaurant.plan} disabled={savingId === restaurant.id || trial} onChange={(e) => changePlan(restaurant.id, e.target.value)} style={{ border: 0, borderRadius: 6, padding: "5px 7px", color: "#6571a4", background: "#f0f1ff", fontSize: 9, fontWeight: 700 }}><option value="trial">Trial</option>{planOptions.map((plan) => <option key={plan} value={plan}>{planLabels[plan]}</option>)}</select></td><td><span className={`admin-status ${active ? "active" : "inactive"}`}><i /> {active ? "نشط" : "غير نشط"}</span></td><td>{trial ? formatDate(restaurant.trial_ends_at) : "—"}</td><td>{formatDate(restaurant.subscription_started_at)}</td><td><div className="admin-actions">{trial && <button className="admin-edit" disabled={savingId === restaurant.id} onClick={() => { setTrialDays(14); setTrialModal(restaurant); }}><CalendarPlus size={14} /> تمديد</button>}{!trial && <button className="admin-edit" disabled={savingId === restaurant.id} onClick={() => changePlan(restaurant.id, restaurant.plan === "premium" ? "pro" : "premium")}>{restaurant.plan === "premium" ? "Pro" : "Premium"}</button>}</div></td></tr>; })}</tbody>
              </table>
              {!loading && filteredRestaurants.length === 0 && <div className="admin-empty">لا توجد مطاعم مطابقة للبحث</div>}
              {loading && <div className="admin-empty">جارٍ تحميل بيانات المطاعم...</div>}
            </div>
          </section>
        </div>
      </main>

      {trialModal && <div className="admin-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setTrialModal(null)}><div className="admin-modal"><div className="admin-modal-header"><div><small>إدارة التجربة</small><h2>تمديد تجربة {trialModal.restaurant_name || "المطعم"}</h2></div><button onClick={() => setTrialModal(null)} aria-label="إغلاق"><X size={19} /></button></div><div className="admin-modal form" style={{ padding: "20px 24px 24px" }}><label>عدد الأيام<input type="number" min="1" max="365" value={trialDays} onChange={(e) => setTrialDays(e.target.value)} /></label><div className="admin-modal-actions"><button type="button" onClick={() => setTrialModal(null)}>إلغاء</button><button type="button" onClick={extendTrial}>تأكيد التمديد</button></div></div></div></div>}
    </div>
  );
}
