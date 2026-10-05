/* ==========================================================================
   AuthContext.jsx — حالة تسجيل الدخول عبر كل التطبيق
   --------------------------------------------------------------------------
   لماذا Context هنا بالذات؟ لأن "هل المستخدم مسجّل دخول؟ وما دوره؟"
   سؤال يحتاجه أكثر من مكوّن بعيد عن بعضه (Navbar، ProtectedRoute، لوحات
   التحكم)، فتمرير الحالة عبر props يدويًا (prop drilling) يصبح مزعجًا.
   ========================================================================== */
import { ROLE_DEFAULTS } from "../config/permissions";
import { createContext, useContext, useEffect, useState } from "react";
import { login as apiLogin, logout as apiLogout, register as apiRegister, fetchCurrentUser } from "../api/auth";
import { getToken } from "../api/client";
import { startDemo as apiStartDemo } from "../api/demo";
import { clearOfflineData, saveUser, savedUser } from "../offline/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { id, email, role, restaurantName }
  const [loading, setLoading] = useState(true); // true أثناء التحقق من الجلسة عند فتح التطبيق

  // عند أول تحميل: لو في توكن محفوظ، نتحقق أنه ما زال صالحًا ونجلب بيانات المستخدم.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    fetchCurrentUser()
      .then(setUser)
      // No connection is not a sign-out: open with the user saved on this device.
      .catch((err) => {
        if (err?.status === 401) clearOfflineData(); // توكن منتهي أو غير صالح: لا نعيده دون اتصال
        setUser(err?.status === 0 ? savedUser() : null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Remember the user so the app can open offline (removed on sign-out).
  useEffect(() => { if (user) saveUser(user); }, [user]);

  // Keep permissions current: when the owner changes an employee's permissions
  // (or disables the account), the employee's screen follows within ~30 s,
  // on returning to the tab, or right after the API refuses an action.
  useEffect(() => {
    if (!user) return undefined;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      // 401 = access revoked (disabled, role or password changed): back to login.
      fetchCurrentUser().then(setUser).catch((err) => { if (err?.status === 401) { clearOfflineData(); setUser(null); } });
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("menupilot:permission-denied", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("menupilot:permission-denied", refresh); };
  }, [Boolean(user)]); // eslint-disable-line react-hooks/exhaustive-deps

  async function login(payload) {
    const data = await apiLogin(payload);
    setUser(data.user);
    return data;
  }

  /** «Try it»: log in to the demo restaurant as owner, kitchen, cashier or waiter. */
  async function startDemo(role) {
    const data = await apiStartDemo(role);
    setUser(data.user);
    return data;
  }

  async function register(payload) {
    const data = await apiRegister(payload);
    setUser(data.user);
    return data;
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  /** تحديث بيانات المستخدم محليًا فورًا (بدون إعادة تسجيل دخول) — تُستخدم
   *  بعد أي طلب PATCH بيرجّع نسخة محدّثة من user، زي تبديل الباقة أو حفظ
   *  الثيم، عشان الواجهة (Sidebar/DashboardShell...) تعكس التغيير فورًا. */
  function updateUser(patch) {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  // Permissions come from the API (GET /auth/me, login). They only drive what
  // the UI shows; Laravel enforces every one of them on the server.
  const permissions = user?.permissions || ROLE_DEFAULTS[user?.role] || [];
  // No role shortcuts: the platform admin only holds platform permissions.
  const can = (permission) => permissions.includes(permission);

  const value = {
    user,
    role: user?.role ?? null, // "owner" | "manager" | "kitchen" | "cashier" | "waiter" | "admin"
    permissions,
    can,
    isAuthenticated: Boolean(user),
    loading,
    login,
    register,
    logout,
    updateUser, startDemo };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** الاستخدام: const { user, login, logout } = useAuth(); */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
