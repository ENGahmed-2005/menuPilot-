import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getRoleHome } from "../../utils/roleHome";
import AuthLayout from "../../components/auth/AuthLayout";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }
    setLoading(true);
    try {
      const data = await login({ email: email.trim(), password });
      const from = location.state?.from?.pathname;
      navigate(from || getRoleHome(data.user?.role), { replace: true });
    } catch (err) {
      setError(err.message || "فشل تسجيل الدخول. تحقق من بياناتك.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout eyebrow="تسجيل الدخول" title="أهلًا بعودتك." subtitle="كل ما تحتاجه لإدارة مطعمك، من الطلب الأول إلى آخر فاتورة.">
      <div className="mb-8">
        <h1 className="font-arabic-display text-4xl leading-tight text-ink sm:text-[42px]">سجّل الدخول إلى menuPilot</h1>
        <p className="mt-3 text-sm leading-6 text-ink-soft">أدخل بيانات حسابك للوصول إلى لوحة إدارة المطعم.</p>
      </div>

      {error && <div role="alert" className="mb-5 rounded-2xl border border-brick/30 bg-brick/5 px-4 py-3 text-sm leading-6 text-brick">{error}</div>}

      <form onSubmit={submit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-bold text-ink">البريد الإلكتروني</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft/50" size={18} />
            <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="w-full rounded-2xl border border-ink/15 bg-paper px-11 py-3.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/40 focus:border-copper focus:ring-4 focus:ring-copper/10" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="password" className="block text-sm font-bold text-ink">كلمة المرور</label>
            <Link to="/forgot-password" className="text-xs font-bold text-copper-deep transition hover:text-copper no-underline">نسيت كلمة المرور؟</Link>
          </div>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft/50" size={18} />
            <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="أدخل كلمة المرور" className="w-full rounded-2xl border border-ink/15 bg-paper px-11 py-3.5 pl-12 text-sm text-ink outline-none transition placeholder:text-ink-soft/40 focus:border-copper focus:ring-4 focus:ring-copper/10" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-soft/60 transition hover:bg-ink/5 hover:text-ink">
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-copper px-5 py-3.5 text-sm font-extrabold text-ink shadow-lg shadow-copper/15 transition hover:-translate-y-0.5 hover:bg-copper-deep disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          {!loading && <ArrowLeft size={17} className="transition group-hover:-translate-x-1" />}
        </button>
      </form>

      <div className="my-7 flex items-center gap-4"><span className="h-px flex-1 bg-ink/10" /><span className="text-xs text-ink-soft/50">أو</span><span className="h-px flex-1 bg-ink/10" /></div>
      <p className="text-center text-sm text-ink-soft">ليس لديك حساب؟ <Link to="/register" className="font-extrabold text-copper-deep no-underline hover:text-copper">إنشاء حساب جديد</Link></p>

      {/* بيانات وهمية للاختبار فقط — راجع src/api/mockServer.js. حساب لكل
          باقة عشان تقدر تجرّب اختلاف اللوحة والمزايا (تخصيص الثيم مثلًا)
          بين basic/pro/premium بدون تبديل باقة الحساب يدويًا كل مرة. */}
      <div className="mt-8 rounded-2xl border border-copper/20 bg-copper/5 p-4 text-xs leading-relaxed text-ink-soft">
        <strong className="mb-1.5 block text-ink">حسابات تجريبية (بيانات وهمية)</strong>
        <div className="grid gap-1">
          <span>owner@menupilot.test <span className="text-ink-soft/50">— باقة Premium</span></span>
          <span>owner.pro@menupilot.test <span className="text-ink-soft/50">— باقة Pro</span></span>
          <span>owner.basic@menupilot.test <span className="text-ink-soft/50">— باقة Basic</span></span>
          <span>kitchen@ / cashier@ / waiter@menupilot.test</span>
        </div>
        كلمة المرور للجميع: <strong className="text-ink">password123</strong>
      </div>
    </AuthLayout>
  );
}
