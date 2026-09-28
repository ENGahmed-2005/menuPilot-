/* ==========================================================================
   SettingsDialog.jsx — restaurant settings in a popup instead of sidebar
   pages. Tabs on the side (top on phones); each tab renders the existing
   settings page, loaded on demand. Direct links (/owner/settings, …) still
   work as full pages. Closes by itself when something inside navigates.
   ========================================================================== */
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Modal from "../ui/Modal";
import Skeleton from "../ui/Skeleton";

const PAGES = {
  "/owner/settings": lazy(() => import("../../pages/owner/RestaurantSettings")),
  "/owner/branding": lazy(() => import("../../pages/owner/BrandingCustomization")),
  "/owner/theme": lazy(() => import("../../pages/owner/ThemeCustomization")),
  "/owner/subscription/current": lazy(() => import("../../pages/owner/SubscriptionPlanPage")),
};

/** items: [[to, label, Icon], …] — already filtered by plan + permission. */
export default function SettingsDialog({ open, onClose, items, initial }) {
  const tabs = items.filter(([to]) => PAGES[to]);
  const [active, setActive] = useState(initial || tabs[0]?.[0]);
  const location = useLocation();
  const openedAt = useRef(location.pathname);

  useEffect(() => { if (open) { setActive(initial || tabs[0]?.[0]); openedAt.current = location.pathname; } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  // A page inside the dialog navigated somewhere (e.g. "لوحة التحكم"): close.
  useEffect(() => { if (open && location.pathname !== openedAt.current) onClose(); }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const Page = PAGES[active];
  return (
    <Modal open={open} onClose={onClose} size="xl" title="الإعدادات" bodyClassName="p-0">
      <div className="flex min-h-[60vh] flex-col md:flex-row">
        <nav aria-label="أقسام الإعدادات" className="flex shrink-0 gap-1 overflow-x-auto border-b border-line p-2 md:w-56 md:flex-col md:overflow-visible md:border-b-0 md:border-l md:p-3">
          {tabs.map(([to, label, Icon]) => (
            <button key={to} type="button" onClick={() => setActive(to)} aria-current={active === to ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-3 text-sm font-bold transition-colors ${active === to ? "bg-copper text-ink" : "text-ink-soft hover:bg-ink/[0.05]"}`}>
              <Icon size={17} aria-hidden="true" /> <span className="whitespace-nowrap">{label}</span>
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1 p-5 md:p-6">
          <Suspense fallback={<div className="space-y-3"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-40" /></div>}>
            {Page ? <Page /> : <p className="text-sm text-muted">لا توجد إعدادات متاحة لحسابك.</p>}
          </Suspense>
        </div>
      </div>
    </Modal>
  );
}
