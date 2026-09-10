import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getSubscriptionPlan, hasPlanFeature } from "../../config/subscriptions";

const LINKS = {
  owner: [
    ["/owner/dashboard", "الرئيسية", "⌂", "dashboard"],
    ["/owner/tables", "الطاولات وQR", "◫", "tables"],
    ["/owner/menu", "القائمة", "▤", "menu"],
    ["/owner/staff", "فريق المطعم", "♟", null],
    ["/owner/reports", "التقارير", "↗", "reports"],
    ["/owner/theme", "تخصيص الثيم", "✦", "theme-presets"],
    ["/owner/settings", "إعدادات المطعم", "⚙", null],
  ],
  kitchen: [["/kitchen", "المطبخ", "♨", "kitchen"]],
  cashier: [["/cashier/tables", "الطاولات والفواتير", "▣", "cashier"]],
  waiter: [["/waiter", "الطاولات والمساعدة", "⌁", "waiter"]],
  admin: [["/admin/dashboard", "الرئيسية", "🛡", null], ["/admin/restaurants", "إدارة المطاعم", "⌂", null]],
};

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const planId = user?.plan || "pro";
  const plan = getSubscriptionPlan(planId);
  const links = (LINKS[role] || []).filter(([, , , feature]) => !feature || hasPlanFeature(planId, feature));

  return (
    <>
      <div className="flex items-center justify-between border-b border-paper/10 bg-ink px-4 py-3 text-paper lg:hidden">
        <span className="font-display text-xl">menuPilot</span>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-paper/10" aria-label="فتح القائمة">☰</button>
      </div>
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-ink/60 lg:hidden" />}
      <aside className={`fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-ink text-paper shadow-2xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="border-b border-paper/10 px-6 py-5">
          <div className="flex items-center justify-between">
            <span className="font-display text-2xl">menuPilot</span>
            <button onClick={() => setOpen(false)} className="lg:hidden" aria-label="إغلاق القائمة">×</button>
          </div>
          {role === "owner" && (
            <div className="mt-4 rounded-2xl border border-copper/20 bg-copper/10 p-3">
              <div className="flex justify-between text-xs"><span className="text-paper/50">الباقة الحالية</span><b className="rounded-full bg-copper px-2 py-1 text-ink">{plan.name}</b></div>
              <div className="mt-2 text-lg font-black">${plan.price}<span className="text-[10px] text-paper/45"> / شهريًا</span></div>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {links.map(([to, label, icon]) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition ${isActive ? "bg-copper text-ink" : "text-paper/65 hover:bg-paper/10 hover:text-paper"}`}>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-paper/5">{icon}</span>{label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-paper/10 px-6 py-4 text-sm text-paper/70">
          <div className="mb-1 truncate">{user?.name || user?.email}</div>
          <div className="mb-3 truncate text-xs text-paper/40">{user?.email}</div>
          <button onClick={logout} className="w-full rounded-full border border-paper/20 px-3.5 py-2 font-bold hover:bg-paper/10">تسجيل الخروج</button>
        </div>
      </aside>
    </>
  );
}
