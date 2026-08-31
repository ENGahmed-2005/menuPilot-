import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getSubscriptionPlan, hasPlanFeature } from "../../config/subscriptions";

const LINKS_BY_ROLE = {
  owner: [
    { to: "/owner/dashboard", label: "الرئيسية", icon: "⌂", feature: "dashboard" },
    { to: "/owner/tables", label: "الطاولات", icon: "◫", feature: "tables" },
    { to: "/owner/menu", label: "القائمة", icon: "▤", feature: "menu" },
    { to: "/owner/reports", label: "التقارير", icon: "↗", feature: "reports" },
    { to: "/owner/theme", label: "تخصيص الثيم", icon: "✦", feature: "theme-presets" },
  ],
  kitchen: [{ to: "/kitchen", label: "المطبخ", icon: "♨", feature: "kitchen" }],
  cashier: [{ to: "/cashier/tables", label: "الطاولات والفواتير", icon: "▣", feature: "cashier" }],
  waiter: [{ to: "/waiter", label: "الطاولات والجلسات", icon: "⌁", feature: "waiter" }],
  // admin مالوش باقة اشتراك (feature) — رابطه ثابت دايمًا.
  admin: [{ to: "/admin/dashboard", label: "كل المطاعم", icon: "🛡" }],
};

const PLAN_PATHS = [["basic", "الأساسية"], ["pro", "الاحترافية"], ["premium", "المميزة"]];

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const planId = user?.plan || "pro";
  const plan = getSubscriptionPlan(planId);
  // الروابط اللي مالهاش "feature" (زي رابط admin) بتفضل ظاهرة دايمًا؛ الباقي
  // بيتفلتر حسب باقة الاشتراك.
  const links = (LINKS_BY_ROLE[role] || []).filter((link) => !link.feature || hasPlanFeature(planId, link.feature));

  return <>
    <div className="flex items-center justify-between border-b border-paper/10 bg-ink px-4 py-3 text-paper lg:hidden"><div><span className="font-display text-xl">menuPilot</span>{role === "owner" && <span className="mr-2 rounded-full bg-paper/10 px-2 py-0.5 text-[10px] font-bold text-copper">{plan.name}</span>}</div><button type="button" onClick={() => setOpen(true)} aria-label="فتح القائمة" className="rounded-lg p-2 hover:bg-paper/10">☰</button></div>
    {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-ink/60 lg:hidden" />}
    <aside className={`fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-ink text-paper shadow-2xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${open ? "translate-x-0" : "translate-x-full"}`}>
      <div className="border-b border-paper/10 px-6 py-5"><div className="flex items-center justify-between"><span className="font-display text-2xl">menuPilot</span><button onClick={() => setOpen(false)} className="lg:hidden">×</button></div>{role === "owner" && <div className="mt-4 rounded-2xl border border-copper/20 bg-copper/10 p-3"><div className="flex items-center justify-between"><span className="text-xs text-paper/50">الباقة الحالية</span><span className="rounded-full bg-copper px-2.5 py-1 text-[10px] font-black text-ink">{plan.name}</span></div><div className="mt-2 text-lg font-black">${plan.price}<span className="text-[10px] font-normal text-paper/45"> / شهريًا</span></div></div>}</div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {links.map((link) => <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-bold transition ${isActive ? "bg-copper text-ink" : "text-paper/65 hover:bg-paper/10 hover:text-paper"}`}><span className="grid h-7 w-7 place-items-center rounded-lg bg-paper/5">{link.icon}</span>{link.label}</NavLink>)}
        {role === "owner" && <div className="mt-6 border-t border-paper/10 pt-5"><p className="px-3 text-[10px] font-bold text-paper/30">الباقات</p>{PLAN_PATHS.map(([id, label]) => <NavLink key={id} to={`/owner/subscription/${id}`} onClick={() => setOpen(false)} className="mt-1 flex items-center justify-between rounded-xl px-3 py-2 text-xs text-paper/55 hover:bg-paper/10 hover:text-paper"><span>{label}</span><span>${getSubscriptionPlan(id).price}</span></NavLink>)}</div>}
        {role === "owner" && <div className="mt-4 rounded-xl bg-paper/5 p-3 text-xs text-paper/55"><div className="flex justify-between"><span>التقارير المتقدمة</span><span>{hasPlanFeature(planId, "advanced-reports") ? "متاح" : "Premium"}</span></div><div className="mt-2 flex justify-between"><span>التحليلات</span><span>{hasPlanFeature(planId, "analytics") ? "متاح" : "Premium"}</span></div><div className="mt-2 flex justify-between"><span>تخصيص كامل</span><span>{hasPlanFeature(planId, "custom-theme") ? "متاح" : "Premium"}</span></div></div>}
      </nav>
      <div className="border-t border-paper/10 px-6 py-4 text-sm text-paper/70"><div className="mb-3 truncate">{user?.email}</div><button onClick={logout} className="w-full rounded-full border border-paper/20 px-3.5 py-2 font-bold hover:bg-paper/10">تسجيل الخروج</button></div>
    </aside>
  </>;
}
