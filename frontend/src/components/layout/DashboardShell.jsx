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

export default function DashboardShell({ children }) {
  const { user } = useAuth();
  const themeVars = user?.role === "owner" ? resolveThemeVars(user.theme) : null;

  return (
    <div dir="rtl" style={themeVars || undefined} className="min-h-screen bg-paper-2 text-ink lg:flex">
      <a href="#main-content" className="sr-only-focusable fixed right-4 top-4 z-[60] rounded-xl bg-copper px-4 py-2 text-sm font-bold text-ink">
        تخطَّ إلى المحتوى
      </a>
      <Sidebar />
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 outline-none sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-7xl"><TrialBanner />{children}</div>
      </main>
    </div>
  );
}
