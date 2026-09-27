/* ==========================================================================
   Sidebar.jsx — role-based navigation.
   Desktop: sticky rail on the right (RTL). Mobile: top bar showing the
   current page + slide-in drawer (Esc / backdrop / link click closes it).
   Links are grouped by job, the current page uses aria-current, and plan
   gating is unchanged.
   ========================================================================== */
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3, ChefHat, Crown, HandPlatter, LayoutDashboard, LogOut, Menu, Palette,
  QrCode, Receipt, Settings, Sparkles, UtensilsCrossed, Users, X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getSubscriptionPlan, hasPlanFeature } from "../../config/subscriptions";

// [to, label, icon, plan feature (null = always available)]
const NAV = {
  owner: [
    { title: "التشغيل", links: [
      ["/owner/dashboard", "نظرة عامة", LayoutDashboard, "dashboard"],
      ["/owner/tables", "الطاولات ورموز QR", QrCode, "tables"],
      ["/owner/menu", "المنيو", UtensilsCrossed, "menu"],
      ["/owner/staff", "فريق المطعم", Users, null],
      ["/owner/reports", "التقارير", BarChart3, "reports"],
    ] },
    { title: "الهوية والإعدادات", links: [
      ["/owner/theme", "ألوان اللوحة", Sparkles, "theme-presets"],
      ["/owner/branding", "تصميم المنيو", Palette, "branding"],
      ["/owner/settings", "إعدادات المطعم", Settings, null],
    ] },
  ],
  kitchen: [{ links: [["/kitchen", "شاشة المطبخ", ChefHat, "kitchen"]] }],
  cashier: [{ links: [
    ["/cashier/tables", "الطاولات والفواتير", Receipt, "cashier"],
    ["/cashier/reports", "تقارير المبيعات", BarChart3, "cashier"],
  ] }],
  waiter: [{ links: [["/waiter", "الطاولات والطلبات", HandPlatter, "waiter"]] }],
  admin: [{ links: [
    ["/admin/dashboard", "نظرة عامة", LayoutDashboard, null],
    ["/admin/restaurants", "المطاعم", UtensilsCrossed, null],
  ] }],
};

const ROLE_LABEL = { owner: "صاحب المطعم", kitchen: "المطبخ", cashier: "الكاشير", waiter: "النادل", admin: "إدارة المنصة", manager: "مدير" };

function Logo({ compact = false }) {
  return (
    <span className={`brand-logo-surface inline-flex shrink-0 items-center ${compact ? "h-10 px-2" : "h-11 px-2.5"}`}>
      <img src="/menuPilot-logo.svg" alt="menuPilot" className={`${compact ? "h-8" : "h-9"} w-auto`} />
    </span>
  );
}

function PlanCard({ user }) {
  const planId = user?.plan || "basic";
  const plan = getSubscriptionPlan(planId);
  const trial = user?.plan === "trial" && user?.trial_ends_at && new Date(user.trial_ends_at) > new Date();
  const trialDays = trial ? Math.max(0, Math.ceil((new Date(user.trial_ends_at) - Date.now()) / 86400000)) : 0;
  return (
    <div className="mt-4 rounded-2xl border border-paper/10 bg-paper/[0.06] p-3.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-paper/70"><Crown size={14} aria-hidden="true" />{trial ? "التجربة المجانية" : "الباقة الحالية"}</span>
        <b className="rounded-full bg-copper px-2 py-0.5 text-ink">{trial ? "تجربة" : plan.name}</b>
      </div>
      {trial
        ? <p className="mt-2 text-sm font-bold">متبقٍ {trialDays} يوم، وكل الميزات مفعّلة</p>
        : <p className="mt-2 text-lg font-extrabold">${plan.price}<span className="text-xs font-medium text-paper/60"> / شهريًا</span></p>}
    </div>
  );
}

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const planId = user?.plan || "basic";
  const trial = user?.plan === "trial" && user?.trial_ends_at && new Date(user.trial_ends_at) > new Date();
  const allowed = ([, , , feature]) => !feature || trial || (feature === "branding" && ["pro", "premium"].includes(planId)) || hasPlanFeature(planId, feature);
  const groups = (NAV[role] || []).map((group) => ({ ...group, links: group.links.filter(allowed) })).filter((group) => group.links.length);
  const current = groups.flatMap((g) => g.links).find(([to]) => location.pathname.startsWith(to));

  // Close the drawer on navigation and on Escape; lock page scroll while open.
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [open]);

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-paper/10 bg-ink px-4 py-2.5 text-paper lg:hidden">
        <Logo compact />
        <span className="min-w-0 flex-1 truncate text-center text-sm font-bold text-paper/85">{current?.[1]}</span>
        <button type="button" onClick={() => setOpen(true)} aria-label="فتح القائمة" aria-expanded={open} aria-controls="app-sidebar" className="grid h-10 w-10 place-items-center rounded-xl hover:bg-paper/10">
          <Menu size={22} aria-hidden="true" />
        </button>
      </div>

      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-ink/60 animate-fade-in lg:hidden" aria-hidden="true" />}

      <aside
        id="app-sidebar"
        aria-label="القائمة الرئيسية"
        className={`fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-ink text-paper shadow-2xl transition-transform duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="border-b border-paper/10 px-5 py-5">
          <div className="flex items-center justify-between">
            <Logo />
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق القائمة" className="grid h-9 w-9 place-items-center rounded-xl text-paper/70 hover:bg-paper/10 lg:hidden">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          {role === "owner" && <PlanCard user={user} />}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="التنقل">
          {groups.map((group, index) => (
            <div key={group.title || index} className={index ? "mt-5" : ""}>
              {group.title && <p className="mb-1.5 px-3 text-xs font-bold text-paper/45">{group.title}</p>}
              <ul className="space-y-1">
                {group.links.map(([to, label, Icon]) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      className={({ isActive }) => `group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors ${
                        isActive ? "bg-copper text-ink" : "text-paper/75 hover:bg-paper/[0.08] hover:text-paper"
                      }`}
                    >
                      <Icon size={19} aria-hidden="true" className="shrink-0" />
                      <span className="truncate">{label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-paper/10 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper/10 text-sm font-extrabold" aria-hidden="true">
              {(user?.name || user?.email || "م").trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user?.name || user?.email}</p>
              <p className="truncate text-xs text-paper/55">{ROLE_LABEL[role] || user?.email}</p>
            </div>
          </div>
          <button type="button" onClick={logout} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-paper/15 text-sm font-bold text-paper/85 transition-colors hover:bg-paper/10 hover:text-paper">
            <LogOut size={16} aria-hidden="true" /> تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}
