import { useState } from "react";
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
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./AdminDashboard.css";
import { initialRestaurants, initialUsers } from "./AdminShared";

const mainMenu = [
  {
    to: "/admin/dashboard",
    label: "لوحة التحكم",
    icon: LayoutDashboard,
    end: true,
  },
  {
    to: "/admin/restaurants",
    label: "المطاعم",
    icon: Store,
  },
  {
    to: "/admin/owners",
    label: "المستخدمون",
    icon: Users,
  },
  {
    to: "/admin/subscriptions",
    label: "الاشتراكات",
    icon: FileText,
  },
  {
    to: "/admin/reports",
    label: "التقارير",
    icon: BarChart3,
  },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [restaurants] = useState(() => initialRestaurants);
  const [users] = useState(() => initialUsers);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function handleLogout() {
    if (logout) {
      logout();
    } else {
      localStorage.removeItem("token");
      navigate("/login");
    }
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
          {mainMenu.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
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
          onClick={handleLogout}
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
          </div>

          <div className="admin-date">
            <Bell size={17} />
            menuPilot Admin
          </div>
        </header>

        <div className="admin-content">
          <Outlet context={{ restaurants, users }} />
        </div>
      </main>
    </div>
  );
}