import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getRoleHome } from "../../utils/roleHome";

const inputClass = "w-full rounded-2xl border border-[#4B5147]/20 bg-white px-4 py-3.5 text-sm text-[#1F2420] outline-none transition placeholder:text-[#4B5147]/45 focus:border-[#EEA122] focus:ring-4 focus:ring-[#EEA122]/10";

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
    <main dir="rtl" className="min-h-screen bg-[#F3EFE5] font-[Cairo] text-[#1F2420]">
      <div className="grid min-h-screen lg:grid-cols-[.82fr_1.18fr]">
        <aside className="relative hidden overflow-hidden bg-[#1F2420] p-10 text-[#F3EFE5] lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#EEA122]/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-[#5B7A52]/10 blur-3xl" />
          <Link to="/" className="relative z-10 flex w-fit items-center gap-3 text-xl font-black no-underline text-[#F3EFE5]" dir="ltr">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEA122] text-[#1F2420]">m</span>
            menuPilot
          </Link>
          <div className="relative z-10 max-w-md">
            <span className="mb-5 inline-flex rounded-full border border-[#EEA122]/30 bg-[#EEA122]/10 px-3 py-1 text-xs font-bold text-[#EEA122]">أهلاً بعودتك</span>
            <h1 className="font-[Aref_Ruqaa] text-5xl leading-tight xl:text-6xl">كل ما يحتاجه مطعمك، في مكان واحد.</h1>
            <p className="mt-6 text-sm leading-8 text-[#F3EFE5]/65">سجّل الدخول لمتابعة الطلبات والطاولات والفواتير من نفس اللوحة التي اعتدت عليها.</p>
            <div className="mt-8 space-y-3 text-sm text-[#F3EFE5]/80">
              {["إدارة الطلبات لحظيًا", "قائمة رقمية عبر QR", "لوحات تحكم للأدوار المختلفة"].map((item) => (
                <div key={item} className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5B7A52]/20 text-[#EEA122]"><Check size={14} /></span>{item}</div>
              ))}
            </div>
          </div>
          <p className="relative z-10 text-xs text-[#F3EFE5]/35">نظام إدارة مطاعم حديث · menuPilot</p>
        </aside>

        <section className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-8 sm:py-10">
          <div className="w-full max-w-md">
            <div className="mb-7 flex items-center justify-between">
              <Link to="/" className="text-lg font-black text-[#1F2420] no-underline lg:hidden" dir="ltr">menuPilot</Link>
              <Link to="/register" className="flex items-center gap-2 text-sm font-bold text-[#4B5147] transition hover:text-[#E67E22]">ليس لديك حساب؟ إنشاء حساب <ArrowLeft size={16} /></Link>
            </div>

            <div className="rounded-[28px] border border-[#4B5147]/10 bg-white p-5 shadow-[0_24px_70px_rgba(31,36,32,.08)] sm:p-8 md:p-10">
              <div className="mb-8 text-center">
                <span className="inline-flex rounded-full bg-[#EEA122]/10 px-3 py-1 text-xs font-bold text-[#E67E22]">تسجيل الدخول</span>
                <h1 className="mt-4 font-[Aref_Ruqaa] text-4xl leading-tight text-[#1F2420] sm:text-5xl">أهلاً بعودتك</h1>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#4B5147]/65">أدخل بيانات حسابك للوصول إلى لوحة إدارة المطعم.</p>
              </div>

              {error && <div role="alert" className="mb-6 rounded-2xl border border-[#B33F32]/20 bg-[#B33F32]/5 px-4 py-3 text-sm font-semibold text-[#B33F32]">{error}</div>}

              <form onSubmit={submit} className="grid gap-5" noValidate>
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-bold text-[#1F2420]">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#4B5147]/35" />
                    <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={`${inputClass} pr-11`} />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label htmlFor="password" className="block text-sm font-bold text-[#1F2420]">كلمة المرور</label>
                    <Link to="/forgot-password" className="text-xs font-bold text-[#E67E22] no-underline hover:text-[#EEA122]">نسيت كلمة المرور؟</Link>
                  </div>
                  <div className="relative">
                    <LockKeyhole size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#4B5147]/35" />
                    <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="أدخل كلمة المرور" className={`${inputClass} px-12`} />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#4B5147]/45 transition hover:bg-[#F3EFE5] hover:text-[#1F2420]">
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="mt-2 w-full rounded-full bg-[#EEA122] px-5 py-4 text-sm font-black text-[#1F2420] shadow-lg shadow-[#EEA122]/15 transition hover:-translate-y-0.5 hover:bg-[#E67E22] disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
                </button>
              </form>
            </div>

            {/* بيانات وهمية للاختبار فقط — راجع src/api/mockServer.js. */}
            <div className="mt-5 rounded-2xl border border-[#EEA122]/20 bg-[#EEA122]/5 p-4 text-xs leading-relaxed text-[#4B5147]">
              <strong className="mb-1.5 block text-[#1F2420]">حسابات تجريبية (بيانات وهمية)</strong>
              <div className="grid gap-1">
                <span>owner@menupilot.test <span className="text-[#4B5147]/50">— باقة Premium</span></span>
                <span>owner.pro@menupilot.test <span className="text-[#4B5147]/50">— باقة Pro</span></span>
                <span>owner.basic@menupilot.test <span className="text-[#4B5147]/50">— باقة Basic</span></span>
                <span>kitchen@ / cashier@ / waiter@menupilot.test</span>
                <span>admin@menupilot.test <span className="text-[#4B5147]/50">— لوحة مسؤول المنصة</span></span>
              </div>
              كلمة المرور للجميع: <strong className="text-[#1F2420]">password123</strong>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
