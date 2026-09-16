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
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allow }) {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  // أثناء التحقق من الجلسة عند فتح التطبيق لأول مرة — لا تقفز لصفحة الدخول
  // قبل ما نتأكد فعلاً إنه ما في توكن صالح، وإلا يُعاد توجيه المستخدم خطأً.
  if (loading) return null; // ممكن تستبدلها بمكوّن Spinner لاحقًا

  if (!isAuthenticated) {
    // نحفظ الوجهة الأصلية عشان نرجّعه لها بعد تسجيل الدخول.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allow && !allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
