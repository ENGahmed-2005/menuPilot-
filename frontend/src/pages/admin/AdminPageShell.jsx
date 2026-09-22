import {
  BarChart3,
  Bell,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Menu,
  Settings,
  Store,
  Users,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "../../pages/admin/AdminDashboard.css";

const menuItems = [
  {
    label: "لوحة التحكم",
    icon: LayoutDashboard,
    to: "/admin/dashboard",
  },
  {
    label: "المطاعم",
    icon: Store,
    to: "/admin/restaurants",
  },
  {
    label: "المستخدمون",
    icon: Users,
    to: "/admin/owners",
  },
  {
    label: "الاشتراكات",
    icon: FileText,
    to: "/admin/subscriptions",
  },
  {
    label: "التقارير",
    icon: BarChart3,
    to: "/admin/reports",
  },
];

export default function AdminPageShell({ children, title }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="admin-dashboard" dir="rtl">
      <aside
        className={`admin-sidebar ${
          sidebarOpen ? "open" : ""
        }`}
      >
        <div className="admin-brand">
          <div className="admin-logo">m</div>

          <div>
            <strong>
              menu<span>Pilot</span>
            </strong>
            <small>لوحة الإدارة العامة</small>
          </div>

          <button
            type="button"
            className="admin-sidebar-close"
            onClick={closeSidebar}
            aria-label="إغلاق القائمة"
          >
            <X size={20} />
          </button>
        </div>

        <p className="admin-menu-title">
          إدارة المنصة
        </p>

        <nav className="admin-nav">
          {menuItems.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `admin-nav-item ${
                  isActive ? "selected" : ""
                }`
              }
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <p className="admin-menu-title admin-account-title">
          النظام
        </p>

        <nav className="admin-nav">
          <NavLink
            to="/admin/settings"
            onClick={closeSidebar}
            className={({ isActive }) =>
              `admin-nav-item ${
                isActive ? "selected" : ""
              }`
            }
          >
            <Settings size={19} />
            <span>الإعدادات</span>
          </NavLink>

          <NavLink
            to="/admin/notifications"
            onClick={closeSidebar}
            className={({ isActive }) =>
              `admin-nav-item ${
                isActive ? "selected" : ""
              }`
            }
          >
            <Bell size={19} />
            <span>الإشعارات</span>
          </NavLink>
        </nav>

        <div className="admin-user-box">
          <div className="admin-user-avatar">
            {(user?.name || "م").charAt(0)}
          </div>

          <div>
            <strong>
              {user?.name || "مدير النظام"}
            </strong>

            <small>
              {user?.email || "مدير النظام"}
            </small>
          </div>

          <ChevronDown size={16} />
        </div>

        <button
          type="button"
          className="admin-logout"
          onClick={logout}
        >
          تسجيل الخروج
        </button>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="admin-overlay"
          onClick={closeSidebar}
          aria-label="إغلاق القائمة"
        />
      )}

      <main className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-mobile-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu size={22} />
          </button>

          <div className="admin-breadcrumb">
            الرئيسية
            <span>/</span>
            <b>{title}</b>
          </div>

          <div className="admin-date">
            <Bell size={17} />
            menuPilot Admin
          </div>
        </header>

        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}