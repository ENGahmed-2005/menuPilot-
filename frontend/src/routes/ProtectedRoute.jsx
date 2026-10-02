/* ==========================================================================
   ProtectedRoute.jsx — حماية المسارات حسب تسجيل الدخول والدور
   --------------------------------------------------------------------------
   NFR-02 (Security): "enforce role-based access so that users can access
   only authorized functions and data."

   الاستخدام:
     <Route element={<ProtectedRoute allow={["owner"]} />}>
       <Route path="/owner/dashboard" element={<Dashboard />} />
     </Route>

   لو ما مرّرت allow، أي مستخدم مسجّل دخول (بأي دور) يقدر يدخل.
   ========================================================================== */
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { getRoleHome } from "../utils/roleHome";
import { useAuth } from "../context/AuthContext";
import { t, dir } from "../i18n";

function NoAccess({ home }) {
  return (
    <main dir={dir} className="grid min-h-screen place-items-center bg-paper-2 px-6 text-center text-ink">
      <div className="max-w-sm">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brick/10 text-brick"><ShieldAlert size={26} aria-hidden="true" /></span>
        <h1 className="mt-4 text-2xl font-extrabold">{t("ليس لديك صلاحية لفتح هذه الصفحة")}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{t("إذا كنت تحتاجها في عملك، اطلب من صاحب المطعم منحك الصلاحية المناسبة.")}</p>
        <Link to={home} className="mt-6 inline-flex h-11 items-center rounded-xl bg-copper px-5 text-sm font-bold text-ink">{t("العودة إلى لوحتي")}</Link>
      </div>
    </main>
  );
}

export default function ProtectedRoute({ allow, permission }) {
  const { isAuthenticated, role, loading, can } = useAuth();
  const location = useLocation();

  // أثناء التحقق من الجلسة عند فتح التطبيق لأول مرة — لا تقفز لصفحة الدخول
  // قبل ما نتأكد فعلاً إنه ما في توكن صالح، وإلا يُعاد توجيه المستخدم خطأً.
  if (loading) return null; // ممكن تستبدلها بمكوّن Spinner لاحقًا

  if (!isAuthenticated) {
    // نحفظ الوجهة الأصلية عشان نرجّعه لها بعد تسجيل الدخول.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Role allow-list and/or a permission (any of "a|b"). Server-side checks
  // still apply to every API call made by the page.
  // A staff member who was GRANTED the page's permission may open it even if
  // their role is not in the default list (owner-only pages have no
  // permission prop and stay closed; the platform admin is never staff).
  const STAFF = ["manager", "cashier", "waiter", "kitchen", "delivery", "delivery_manager"];
  const roleOk = !allow || allow.includes(role) || (Boolean(permission) && STAFF.includes(role));
  const permissionOk = !permission || permission.split("|").some((p) => can(p));
  if (!roleOk || !permissionOk) {
    return <NoAccess home={getRoleHome(role)} />;
  }

  return <Outlet />;
}
