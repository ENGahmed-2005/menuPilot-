/* ==========================================================================
   AuthContext.jsx — حالة تسجيل الدخول عبر كل التطبيق
   --------------------------------------------------------------------------
   لماذا Context هنا بالذات؟ لأن "هل المستخدم مسجّل دخول؟ وما دوره؟"
   سؤال يحتاجه أكثر من مكوّن بعيد عن بعضه (Navbar، ProtectedRoute، لوحات
   التحكم)، فتمرير الحالة عبر props يدويًا (prop drilling) يصبح مزعجًا.
   ========================================================================== */
import { createContext, useContext, useEffect, useState } from "react";
import { login as apiLogin, logout as apiLogout, register as apiRegister, fetchCurrentUser } from "../api/auth";
import { getToken } from "../api/client";

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
      .catch(() => setUser(null)) // توكن منتهي أو غير صالح
      .finally(() => setLoading(false));
  }, []);

  async function login(payload) {
    const data = await apiLogin(payload);
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

  const value = {
    user,
    role: user?.role ?? null, // "owner" | "kitchen" | "cashier" | "waiter"
    isAuthenticated: Boolean(user),
    loading,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** الاستخدام: const { user, login, logout } = useAuth(); */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
