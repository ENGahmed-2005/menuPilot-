import React, { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Menu,
  Pencil,
  Plus,
  Search,
  Settings,
  Store,
  ToggleLeft,
  ToggleRight,
  Users,
  X,
} from "lucide-react";
import "./AdminDashboard.css";

const initialRestaurants = [
  {
    id: 1,
    name: "مطعم الشذا",
    owner: "أحمد محمود",
    plan: "Pro",
    tables: 12,
    revenue: 12450,
    active: true,
  },
  {
    id: 2,
    name: "كافيه البسمة",
    owner: "سارة خالد",
    plan: "Standard",
    tables: 8,
    revenue: 6200,
    active: true,
  },
  {
    id: 3,
    name: "مطعم دمشق الأصيل",
    owner: "محمود علي",
    plan: "Enterprise",
    tables: 20,
    revenue: 0,
    active: false,
  },
];

const menuItems = [
  { label: "لوحة التحكم", icon: LayoutDashboard },
  { label: "المطاعم", icon: Store },
  { label: "المستخدمون", icon: Users },
  { label: "الاشتراكات", icon: FileText },
  { label: "التقارير", icon: BarChart3 },
];

function money(value) {
  return `${new Intl.NumberFormat("ar-SA").format(value)} ر.س`;
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="admin-stat-card">
      <div className={`admin-stat-icon ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p>{title}</p>
        <strong>{value}</strong>
        <small>محدث هذا الشهر</small>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    owner: "",
    plan: "Pro",
    tables: 10,
    revenue: 0,
  });

  const filteredRestaurants = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return restaurants;
    return restaurants.filter((restaurant) =>
      `${restaurant.name} ${restaurant.owner} ${restaurant.plan}`
        .toLowerCase()
        .includes(query),
    );
  }, [restaurants, search]);

  const activeRestaurants = restaurants.filter((restaurant) => restaurant.active).length;
  const totalTables = restaurants.reduce((sum, restaurant) => sum + Number(restaurant.tables), 0);
  const totalRevenue = restaurants.reduce((sum, restaurant) => sum + Number(restaurant.revenue), 0);

  function openAddModal() {
    setEditing(null);
    setForm({ name: "", owner: "", plan: "Pro", tables: 10, revenue: 0 });
    setModalOpen(true);
  }

  function openEditModal(restaurant) {
    setEditing(restaurant);
    setForm({
      name: restaurant.name,
      owner: restaurant.owner,
      plan: restaurant.plan,
      tables: restaurant.tables,
      revenue: restaurant.revenue,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function saveRestaurant(event) {
    event.preventDefault();

    if (!form.name.trim() || !form.owner.trim()) {
      window.alert("يرجى إدخال اسم المطعم واسم المالك");
      return;
    }

    if (editing) {
      setRestaurants((current) =>
        current.map((restaurant) =>
          restaurant.id === editing.id
            ? {
                ...restaurant,
                name: form.name,
                owner: form.owner,
                plan: form.plan,
                tables: Number(form.tables),
                revenue: Number(form.revenue),
              }
            : restaurant,
        ),
      );
    } else {
      setRestaurants((current) => [
        ...current,
        {
          id: Date.now(),
          name: form.name,
          owner: form.owner,
          plan: form.plan,
          tables: Number(form.tables),
          revenue: Number(form.revenue),
          active: true,
        },
      ]);
    }

    closeModal();
  }

  function toggleRestaurant(id) {
    setRestaurants((current) =>
      current.map((restaurant) =>
        restaurant.id === id
          ? { ...restaurant, active: !restaurant.active }
          : restaurant,
      ),
    );
  }

  return (
    <div className="admin-dashboard" dir="rtl">
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-brand">
          <div className="admin-logo">m</div>
          <div>
            <strong>menu<span>Pilot</span></strong>
            <small>نظام إدارة المطاعم</small>
          </div>
          <button className="admin-sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <p className="admin-menu-title">القائمة الرئيسية</p>
        <nav className="admin-nav">
          {menuItems.map(({ label, icon: Icon }, index) => (
            <button
              key={label}
              className={`admin-nav-item ${index === 0 ? "selected" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === "المطاعم" && <em>{restaurants.length}</em>}
            </button>
          ))}
        </nav>

        <p className="admin-menu-title admin-account-title">إدارة الحساب</p>
        <nav className="admin-nav">
          <button className="admin-nav-item"><Settings size={19} /><span>الإعدادات</span></button>
          <button className="admin-nav-item"><Bell size={19} /><span>الإشعارات</span></button>
        </nav>

        <div className="admin-user-box">
          <div className="admin-user-avatar">م</div>
          <div>
            <strong>محمد المدير</strong>
            <small>مدير النظام</small>
          </div>
          <ChevronDown size={16} />
        </div>
        <button className="admin-logout">تسجيل الخروج</button>
      </aside>

      {sidebarOpen && (
        <button className="admin-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="admin-main">
        <header className="admin-topbar">
          <button className="admin-mobile-menu" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="admin-breadcrumb">الرئيسية <span>/</span> <b>لوحة التحكم</b></div>
          <div className="admin-date"><Bell size={17} /> السبت، 12 سبتمبر 2026</div>
        </header>

        <div className="admin-content">
          <section className="admin-heading">
            <div>
              <p className="admin-overline"><Activity size={14} /> نظرة عامة لحظية</p>
              <h1>لوحة تحكم المسؤول العام</h1>
              <p>إدارة المطاعم والاشتراكات والأرباح من مكان واحد.</p>
            </div>
            <button className="admin-primary-button" onClick={openAddModal}>
              <Plus size={18} /> إضافة مطعم جديد
            </button>
          </section>

          <section className="admin-stats-grid">
            <StatCard title="إجمالي المطاعم" value={restaurants.length} icon={Building2} color="orange" />
            <StatCard title="المطاعم النشطة" value={activeRestaurants} icon={Store} color="blue" />
            <StatCard title="إجمالي الأرباح" value={money(totalRevenue)} icon={CircleDollarSign} color="green" />
            <StatCard title="الجلسات النشطة حاليًا" value={totalTables} icon={Users} color="purple" />
          </section>

          <section className="admin-table-card">
            <div className="admin-table-heading">
              <div>
                <p>إدارة الحسابات</p>
                <h2>قائمة المطاعم المسجلة</h2>
              </div>
              <span className="admin-live"><i /> البيانات محدثة الآن</span>
            </div>

            <div className="admin-toolbar">
              <div className="admin-search">
                <Search size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث باسم المطعم أو المالك..."
                />
                {search && (
                  <button onClick={() => setSearch("")}><X size={15} /></button>
                )}
              </div>
              <span>عرض {filteredRestaurants.length} من {restaurants.length} مطاعم</span>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>اسم المطعم</th>
                    <th>المالك</th>
                    <th>الباقة</th>
                    <th>عدد الطاولات</th>
                    <th>إجمالي الإيرادات</th>
                    <th>الحالة</th>
                    <th>إجراءات التحكم</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRestaurants.map((restaurant) => (
                    <tr key={restaurant.id}>
                      <td><strong>{restaurant.name}</strong></td>
                      <td>{restaurant.owner}</td>
                      <td><span className="admin-plan">{restaurant.plan}</span></td>
                      <td>{restaurant.tables} طاولات</td>
                      <td className="admin-revenue">{money(restaurant.revenue)}</td>
                      <td>
                        <span className={`admin-status ${restaurant.active ? "active" : "inactive"}`}>
                          <i /> {restaurant.active ? "نشط" : "قيد الإيقاف"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button className="admin-edit" onClick={() => openEditModal(restaurant)}>
                            <Pencil size={14} /> تعديل
                          </button>
                          <button
                            className={restaurant.active ? "admin-disable" : "admin-enable"}
                            onClick={() => toggleRestaurant(restaurant.id)}
                          >
                            {restaurant.active ? <ToggleLeft size={15} /> : <ToggleRight size={15} />}
                            {restaurant.active ? "تعطيل" : "تفعيل"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredRestaurants.length === 0 && (
                <div className="admin-empty">لا توجد نتائج مطابقة للبحث</div>
              )}
            </div>
          </section>
        </div>
      </main>

      {modalOpen && (
        <div className="admin-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div><small>إدارة المطاعم</small><h2>{editing ? "تعديل المطعم" : "إضافة مطعم جديد"}</h2></div>
              <button onClick={closeModal}><X size={19} /></button>
            </div>
            <form onSubmit={saveRestaurant}>
              <label>اسم المطعم<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="مثال: مطعم الشذا" /></label>
              <label>اسم المالك<input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} placeholder="مثال: أحمد محمود" /></label>
              <div className="admin-form-row">
                <label>الباقة<select value={form.plan} onChange={(event) => setForm({ ...form, plan: event.target.value })}><option>Pro</option><option>Standard</option><option>Enterprise</option></select></label>
                <label>عدد الطاولات<input type="number" min="1" value={form.tables} onChange={(event) => setForm({ ...form, tables: event.target.value })} /></label>
              </div>
              <label>الإيرادات الشهرية<input type="number" min="0" value={form.revenue} onChange={(event) => setForm({ ...form, revenue: event.target.value })} /></label>
              <div className="admin-modal-actions"><button type="button" onClick={closeModal}>إلغاء</button><button type="submit"><Check size={16} /> حفظ المطعم</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}