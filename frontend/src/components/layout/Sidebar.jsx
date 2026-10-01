/* ==========================================================================
   Sidebar.jsx — role-based navigation.
   Desktop: sticky rail on the right (RTL). Mobile: top bar showing the
   current page + slide-in drawer (Esc / backdrop / link click closes it).
   Links are grouped by job, the current page uses aria-current, and plan
   gating is unchanged.
   ========================================================================== */
import { useEffect, useState } from "react";
import BrandLogo from "../brand/Logo";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3, Bell, Bike, ChefHat, KeyRound, MapPin, ClipboardList, Crown, FileSpreadsheet, HandPlatter, LayoutDashboard, LogOut, Menu, Palette,
  ChevronDown, QrCode, Receipt, Settings, Settings2, Sparkles, UtensilsCrossed, Users, X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { SUBSCRIPTION_ADDONS, getSubscriptionPlan, monthlyPrice, subscriptionOf, userHasFeature } from "../../config/subscriptions";
import SettingsDialog from "./SettingsDialog";
import { ROLE_DEFAULTS } from "../../config/permissions";

// [to, label, icon, plan feature (null = always), permission(s) "a|b" (null = any)]
// Links are shown only when the plan includes the feature AND the user holds
// the permission. The API enforces the same permissions on every request.
const OPERATIONS = [
  ["/owner/dashboard", "نظرة عامة", LayoutDashboard, "dashboard", "view_dashboard"],
  ["/owner/orders", "الطلبات", ClipboardList, null, "view_orders"],
  ["/owner/outside-orders", "الطلبات الخارجية", Bike, "online_orders", "view_orders"],
  ["/owner/deliveries", "التوصيل", MapPin, "online_orders", "view_orders"],
  ["/cashier/tables", "الطاولات والفواتير", Receipt, "cashier", "view_payments"],
  ["/waiter", "طلبات النادل", HandPlatter, "waiter", "handle_assistance"],
  ["/kitchen", "شاشة المطبخ", ChefHat, "kitchen", "manage_orders"],
];
// Groups with a title render as collapsible menus (one open at a time), so the
// sidebar fits the screen without scrolling. The "settings" group is not listed:
// it opens in a popup from the settings button (SettingsDialog).
const NAV = {
  owner: [
    { id: "ops", title: "التشغيل", icon: LayoutDashboard, links: OPERATIONS },
    { id: "manage", title: "الإدارة", icon: Settings2, links: [
      ["/owner/tables", "الطاولات ورموز QR", QrCode, "tables", "manage_tables"],
      ["/owner/menu", "المنيو", UtensilsCrossed, "menu", "manage_menu"],
      ["/owner/staff", "الفريق والصلاحيات", Users, null, "manage_staff"],
      ["/owner/reports", "التقارير", BarChart3, "reports", "view_reports"],
      ["/owner/accounting", "المحاسبة والتصدير", FileSpreadsheet, null, "export_reports|export_invoices|export_payments|export_sales|manage_accounting_settings"],
    ] },
    { id: "settings", settings: true, links: [
      ["/owner/settings", "إعدادات المطعم", Settings, null, "manage_settings"],
      ["/owner/online-ordering", "الطلب أونلاين", Bike, "online_orders", "manage_settings"],
      ["/owner/branding", "تصميم المنيو", Palette, "branding", "manage_branding"],
      ["/owner/theme", "ألوان اللوحة", Sparkles, "theme-presets", "manage_branding"],
      ["/owner/subscription/current", "الاشتراك والدفع", Crown, null, "manage_subscription"],
    ] },
  ],
  manager: [
    { id: "ops", title: "التشغيل", icon: LayoutDashboard, links: OPERATIONS },
    { id: "manage", title: "الإدارة", icon: Settings2, links: [
      ["/owner/tables", "الطاولات ورموز QR", QrCode, "tables", "manage_tables"],
      ["/owner/menu", "المنيو", UtensilsCrossed, "menu", "manage_menu"],
      ["/owner/staff", "الفريق والصلاحيات", Users, null, "manage_staff"],
      ["/owner/accounting", "المحاسبة والتصدير", FileSpreadsheet, null, "export_reports|export_invoices|export_payments|export_sales|manage_accounting_settings"],
    ] },
  ],
  kitchen: [{ links: [["/kitchen", "شاشة المطبخ", ChefHat, "kitchen", "manage_orders"]] }],
  delivery: [{ links: [["/delivery", "طلباتي للتوصيل", MapPin, null, "deliver_orders"]] }],
  delivery_manager: [{ links: [["/delivery", "إدارة التوصيل", MapPin, null, "dispatch_deliveries"]] }],
  cashier: [{ links: [
    ["/cashier/tables", "الطاولات والفواتير", Receipt, "cashier", "view_payments"],
    ["/cashier/reports", "تقارير المبيعات", BarChart3, "cashier", "view_reports|view_payments"],
    ["/owner/accounting", "المحاسبة والتصدير", FileSpreadsheet, null, "export_reports|export_invoices|export_payments|export_sales|manage_accounting_settings"],
  ] }],
  waiter: [{ links: [["/waiter", "الطاولات والطلبات", HandPlatter, "waiter", "view_tables"]] }],
  admin: [
    { id: "platform", title: "إدارة المنصة", icon: LayoutDashboard, links: [
      ["/admin/dashboard", "نظرة عامة", LayoutDashboard, null, null],
      ["/admin/restaurants", "المطاعم", UtensilsCrossed, null, null],
      ["/admin/owners", "أصحاب المطاعم", Users, null, null],
      ["/admin/password-requests", "استعادة كلمات المرور", KeyRound, null, null],
      ["/admin/subscriptions", "الاشتراكات", Crown, null, null],
      ["/admin/reports", "التقارير", BarChart3, null, null],
    ] },
    { id: "system", title: "النظام", icon: Settings2, links: [
      ["/admin/settings", "إعدادات النظام", Settings, null, null],
      ["/admin/notifications", "الإشعارات", Bell, null, null],
    ] },
  ],
};

const ROLE_LABEL = { delivery_manager: "مسؤول التوصيل", delivery: "سائق توصيل", owner: "صاحب المطعم", kitchen: "المطبخ", cashier: "الكاشير", waiter: "النادل", admin: "إدارة المنصة", manager: "مدير" };

function Logo({ compact = false }) {
  return <BrandLogo on="dark" height={compact ? 30 : 36} priority />;
}

function PlanCard({ user }) {
  const { plan: planId, addons, trial } = subscriptionOf(user);
  const plan = getSubscriptionPlan(planId);
  // Days and status come from the server (user.subscription), not the browser clock.
  const sub = user?.subscription;
  const trialDays = sub ? sub.remaining_days : trial ? Math.max(0, Math.ceil((new Date(user.trial_ends_at) - Date.now()) / 86400000)) : 0;
  if (sub && (sub.status === "EXPIRED" || sub.status === "CANCELLED")) {
    return (
      <div className="mt-3 rounded-xl border border-copper/30 bg-copper/10 px-3 py-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-paper/80"><Crown size={14} aria-hidden="true" />{sub.status === "CANCELLED" ? "الاشتراك متوقف" : "انتهت التجربة المجانية"}</span>
          <b className="rounded-full bg-copper px-2 py-0.5 text-ink">{sub.in_grace ? "مهلة" : "مقيّد"}</b>
        </div>
        <p className="mt-1 text-xs font-bold">{sub.payment_pending ? "دفعتك قيد التحقق" : "اختر خطة لإعادة التفعيل"}</p>
      </div>
    );
  }
  return (
    <div className="mt-3 rounded-xl border border-paper/10 bg-paper/[0.06] px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-paper/70"><Crown size={14} aria-hidden="true" />{trial ? "التجربة المجانية" : "الباقة الحالية"}</span>
        <b className="rounded-full bg-copper px-2 py-0.5 text-ink">{trial ? "تجربة" : plan.name}</b>
      </div>
      {trial
        ? <p className="mt-1 text-xs font-bold">متبقٍ {trialDays} يوم، وكل الميزات مفعّلة</p>
        : <>
            <p className="mt-1 text-sm font-extrabold">${monthlyPrice(plan.id, addons)}<span className="text-xs font-medium text-paper/70"> / شهريًا</span></p>
            {addons.length > 0 && <p className="mt-0.5 text-xs text-paper/70">+ {addons.map((id) => SUBSCRIPTION_ADDONS[id]?.name).join("، ")}</p>}
          </>}
    </div>
  );
}

export default function Sidebar() {
  const { user, role, logout, can, permissions } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const planId = subscriptionOf(user).plan;
  const planAllows = (feature) => userHasFeature(user, feature);
  const allowed = ([, , , feature, permission]) => planAllows(feature) && (!permission || permission.split("|").some((p) => can(p)));
  const baseGroups = (NAV[role] || []).map((group) => ({ ...group, links: group.links.filter(allowed) })).filter((group) => group.links.length);
  // Pages unlocked by permissions granted beyond the role's defaults appear in
  // «صلاحيات إضافية», so granting a permission updates the employee's menu
  // (permissions refresh live, see AuthContext).
  const extraLinks = (() => {
    if (!["cashier", "waiter", "kitchen", "delivery", "delivery_manager"].includes(role)) return [];
    const defaults = ROLE_DEFAULTS[role] || [];
    const granted = (permissions || []).filter((p) => !defaults.includes(p));
    const present = new Set(baseGroups.flatMap((g) => g.links.map(([to]) => to)));
    const candidates = [...OPERATIONS, ...NAV.manager[1].links];
    const seen = new Set();
    return candidates.filter((link) => {
      const [to, , , , permission] = link;
      if (!permission || present.has(to) || seen.has(to)) return false;
      if (!permission.split("|").some((p) => granted.includes(p)) || !allowed(link)) return false;
      seen.add(to);
      return true;
    });
  })();
  const allGroups = extraLinks.length ? [...baseGroups, { id: "extra", title: "صلاحيات إضافية", icon: Sparkles, links: extraLinks }] : baseGroups;
  const groups = allGroups.filter((g) => !g.settings);
  const settingsItems = allGroups.find((g) => g.settings)?.links || [];
  const [settingsOpen, setSettingsOpen] = useState(false);
  const activeGroup = groups.find((g) => g.links.some(([to]) => location.pathname.startsWith(to)))?.id;
  const [openGroup, setOpenGroup] = useState(activeGroup || groups[0]?.id);
  useEffect(() => { if (activeGroup) setOpenGroup(activeGroup); }, [activeGroup]);
  const current = [...groups.flatMap((g) => g.links), ...settingsItems].find(([to]) => location.pathname.startsWith(to));

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
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-paper/10 bg-navy px-4 py-2.5 text-paper lg:hidden">
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
        className={`fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-navy text-paper shadow-2xl transition-transform duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="border-b border-paper/10 px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo />
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق القائمة" className="grid h-9 w-9 place-items-center rounded-xl text-paper/70 hover:bg-paper/10 lg:hidden">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          {role === "owner" && <PlanCard user={user} />}
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-label="التنقل">
          {groups.map((group) => {
            const collapsible = Boolean(group.title) && groups.length > 1;
            const expanded = !collapsible || openGroup === group.id;
            const GroupIcon = group.icon;
            return (
              <div key={group.id || "main"} className="mb-1">
                {collapsible && (
                  <button type="button" onClick={() => setOpenGroup(expanded ? null : group.id)} aria-expanded={expanded} aria-controls={`nav-${group.id}`}
                    className={`flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-extrabold transition-colors ${expanded ? "text-paper" : "text-paper/70 hover:bg-paper/[0.06] hover:text-paper"}`}>
                    {GroupIcon && <GroupIcon size={18} aria-hidden="true" className="shrink-0 text-paper/70" />}
                    <span className="flex-1 text-right">{group.title}</span>
                    {activeGroup === group.id && !expanded && <span className="h-2 w-2 rounded-full bg-copper" aria-label="الصفحة الحالية هنا" />}
                    <ChevronDown size={16} aria-hidden="true" className={`shrink-0 transition-transform duration-200 motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} />
                  </button>
                )}
                {expanded && (
                  <ul id={`nav-${group.id}`} className={`space-y-0.5 ${collapsible ? "mb-2 mt-0.5 border-r border-paper/10 pr-2 mr-4 animate-fade-in" : ""}`}>
                    {group.links.map(([to, label, Icon]) => (
                      <li key={to}>
                        <NavLink
                          to={to.replace("/current", `/${planId}`)}
                          className={({ isActive }) => `flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors ${
                            isActive ? "bg-copper text-ink" : "text-paper/75 hover:bg-paper/[0.08] hover:text-paper"
                          }`}
                        >
                          <Icon size={18} aria-hidden="true" className="shrink-0" />
                          <span className="truncate">{label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-paper/10 p-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper/10 text-sm font-extrabold" aria-hidden="true">
              {(user?.name || user?.email || "م").trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{user?.name || user?.email}</p>
              <p className="truncate text-xs text-paper/70">{ROLE_LABEL[role] || user?.email}</p>
            </div>
            {settingsItems.length > 0 && (
              <button type="button" onClick={() => setSettingsOpen(true)} aria-label="الإعدادات" title="الإعدادات" aria-haspopup="dialog"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper">
                <Settings size={18} aria-hidden="true" />
              </button>
            )}
            <button type="button" onClick={logout} aria-label="تسجيل الخروج" title="تسجيل الخروج"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-paper/80 transition-colors hover:bg-brick/30 hover:text-paper">
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} items={settingsItems} />
    </>
  );
}
