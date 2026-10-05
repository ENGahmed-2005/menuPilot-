/* ==========================================================================
   DashboardShell.jsx — shared frame for every staff/owner page.
   Sidebar on the right (RTL), skip link for keyboard users, and a content
   width that suits both the tablet in the kitchen and a wide office screen.
   An owner's saved theme overrides the CSS colour variables at the root, so
   every component inherits it without knowing about themes.
   ========================================================================== */
import { useAuth } from "../../context/AuthContext";
import { resolveThemeVars } from "../../config/themes";
import Sidebar from "./Sidebar";
import TrialBanner from "../subscription/TrialBanner";
import { t, dir } from "../../i18n";
import { useNavigate } from "react-router-dom";

export default function DashboardShell({ children }) {
  const { user } = useAuth();
  const themeVars = user?.role === "owner" ? resolveThemeVars(user.theme) : null;

  return (
    <div dir={dir} style={themeVars || undefined} className="min-h-screen bg-paper-2 text-ink lg:flex">
      <a href="#main-content" className="sr-only-focusable fixed right-4 top-4 z-[60] rounded-xl bg-copper px-4 py-2 text-sm font-bold text-ink">
        {t("تخطَّ إلى المحتوى")}
      </a>
      <Sidebar />
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 outline-none sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-7xl"><DemoBanner /><TrialBanner />{children}</div>
      </main>
    </div>
  );
}

/* The demo restaurant (DemoRestaurant): say so, and offer a real account. */
function DemoBanner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user?.is_demo) return null;
  return (
    <div role="note" className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-copper/30 bg-copper/10 px-4 py-3 text-sm">
      <b className="text-ink">{t("هذا مطعم تجريبي.")}</b>
      <span className="text-ink-soft">{t("جرّب كل شيء بحرية، وتُعاد بياناته كل يوم.")}</span>
      <button type="button" onClick={async () => { await logout().catch(() => {}); navigate("/register"); }}
        className="ms-auto inline-flex min-h-10 items-center rounded-xl bg-ink px-4 text-sm font-bold text-paper">{t("أنشئ حسابك")}</button>
    </div>
  );
}
