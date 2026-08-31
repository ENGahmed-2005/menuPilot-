/* ==========================================================================
   Login.jsx — تسجيل دخول (كل الأدوار: owner/kitchen/cashier/waiter/admin). FR-02.
   ========================================================================== */
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getRoleHome } from "../../utils/roleHome";
import AuthLayout from "../../components/auth/AuthLayout";
import FormField from "../../components/auth/FormField";
import PasswordField from "../../components/auth/PasswordField";
import FormAlert from "../../components/auth/FormAlert";
import AuthSubmitButton from "../../components/auth/AuthSubmitButton";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login({ email: email.trim(), password });
      const redirectTo = location.state?.from?.pathname || getRoleHome(data.user?.role);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "فشل تسجيل الدخول. الرجاء التحقق من بيانات الدخول.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="تسجيل الدخول"
      title="أهلاً بعودتك."
      subtitle="سجّل الدخول بحساب مطعمك أو الكاشير أو النادل أو المطبخ."
    >
      <h1 className="mb-7 font-display text-3xl text-ink">أهلاً بعودتك</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField
          id="email"
          label="البريد الإلكتروني"
          icon={Mail}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <div>
          <PasswordField
            id="password"
            label="كلمة المرور"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <div className="mt-2 text-left">
            <Link to="/forgot-password" className="text-xs font-medium text-copper-deep hover:underline">
              نسيت كلمة المرور؟
            </Link>
          </div>
        </div>

        <AuthSubmitButton loading={loading}>
          {loading ? "جارِ تسجيل الدخول…" : "تسجيل الدخول"}
        </AuthSubmitButton>

        {error && <FormAlert>{error}</FormAlert>}
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        ليس لديك حساب؟{" "}
        <Link to="/register" className="font-medium text-ink transition-colors hover:text-copper">
          إنشاء حساب
        </Link>
      </p>

      {/* بيانات وهمية للاختبار فقط — راجع src/api/mockServer.js. حساب لكل
          باقة عشان تقدر تجرّب اختلاف اللوحة والمزايا (تخصيص الثيم مثلًا)
          بين basic/pro/premium بدون تبديل باقة الحساب يدويًا كل مرة. */}
      <div className="mt-8 rounded-xl border border-copper/25 bg-copper/5 p-4 text-xs leading-relaxed text-ink-soft">
        <strong className="mb-1 block text-ink">حسابات تجريبية (بيانات وهمية)</strong>
        <div className="grid gap-1">
          <span>owner@menupilot.test <span className="text-ink-soft/50">— باقة Premium</span></span>
          <span>owner.pro@menupilot.test <span className="text-ink-soft/50">— باقة Pro</span></span>
          <span>owner.basic@menupilot.test <span className="text-ink-soft/50">— باقة Basic</span></span>
          <span>kitchen@ / cashier@ / waiter@menupilot.test</span>
          <span>admin@menupilot.test <span className="text-ink-soft/50">— لوحة مسؤول المنصة</span></span>
        </div>
        كلمة المرور للجميع: <strong className="text-ink">password123</strong>
      </div>
    </AuthLayout>
  );
}
