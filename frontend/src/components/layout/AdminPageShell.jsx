/* ==========================================================================
   AdminPageShell.jsx — platform-admin pages use the same frame as every
   other role (shared Sidebar, skip link, spacing). The .admin-dashboard
   wrapper keeps the admin pages' own content classes (tables, stat cards,
   modals) which now read their colours and radii from the design tokens.
   ========================================================================== */
import DashboardShell from "./DashboardShell";
import "../../pages/admin/AdminDashboard.css";

export default function AdminPageShell({ children }) {
  return (
    <DashboardShell>
      <div className="admin-dashboard">{children}</div>
    </DashboardShell>
  );
}
