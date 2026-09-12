import React, { useState } from "react";
import {
  LayoutGrid,
  Building2,
  CreditCard,
  BarChart3,
  Settings,
  Menu,
  X,
  Bell,
  ChevronDown,
} from "lucide-react";

const NAV_ITEMS = [
  { key: "dashboard", label: "لوحة التحكم", icon: LayoutGrid },
  { key: "restaurants", label: "المطاعم", icon: Building2 },
  { key: "subscriptions", label: "الاشتراكات", icon: CreditCard },
  { key: "reports", label: "التقارير", icon: BarChart3 },
  { key: "settings", label: "الإعدادات", icon: Settings },
];

export default function DashboardShell({ children, activeKey = "dashboard" }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div dir="rtl" className="flex min-h-screen bg-gray-50 text-right">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white border-l border-gray-100">
        <SidebarContent activeKey={activeKey} />
      </aside>

      {/* Sidebar - mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-64 bg-white shadow-xl flex flex-col">
            <div className="flex justify-end p-3">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            <SidebarContent activeKey={activeKey} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-bold text-gray-800 lg:hidden">menuPilot</span>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <Bell size={19} />
              <span className="absolute top-1.5 left-1.5 w-2 h-2 bg-orange-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 pr-2 border-r border-gray-100 cursor-pointer">
              <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
                أد
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-sm font-semibold text-gray-800">المسؤول العام</p>
                <p className="text-xs text-gray-400">System Admin</p>
              </div>
              <ChevronDown size={16} className="text-gray-400 hidden sm:block" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ activeKey, onNavigate }) {
  return (
    <>
      <div className="h-16 flex items-center gap-2 px-5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold text-sm">
          م
        </div>
        <span className="font-bold text-gray-800">menuPilot</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === activeKey;
          return (
            <a
              key={item.key}
              href="#"
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? "bg-orange-50 text-orange-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </a>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">menuPilot &copy; 2026</p>
      </div>
    </>
  );
}
