import { useEffect, useState } from "react";
import BrandLogo from "../../components/brand/Logo";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { authErrorMessage, getAuthConfig, loginWithGoogle, resendVerification } from "../../api/auth";
import { getRoleHome } from "../../utils/roleHome";
import { t, dir } from "../../i18n";
import LanguageSwitch from "../../components/ui/LanguageSwitch";
import GoogleMark from "../../components/auth/GoogleMark";

const inputClass = "w-full rounded-2xl border border-[#4B5147]/20 bg-white px-4 py-3.5 text-sm text-[#1F2420] outline-none transition placeholder:text-[#4B5147]/45 focus:border-[#EEA122] focus:ring-4 focus:ring-[#EEA122]/10";

// on="dark" for the dark side panel, default light for the mobile header.
const Logo = ({ on = "dark", height = 40 }) => <BrandLogo on={on} height={height} priority />;

export default function Login() {
  const { login, verifyTwoFactor, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [notice, setNotice] = useState("");
  const [config, setConfig] = useState({ googleEnabled: false });
  // Second step, when the account has two-step verification on.
  const [step, setStep] = useState("password");
  const [code, setCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);

  const goHome = (user) => navigate(location.state?.from?.pathname || getRoleHome(user?.role), { replace: true });

  useEffect(() => { getAuthConfig().then(setConfig); }, []);

  // Already signed in? (back from Google or an e-mail link, or a device that
  // forgot who was signed in): go straight on. ?error= comes back from Google.
  useEffect(() => {
    const failed = params.get("error");
    if (failed) {
      if (failed === "GOOGLE_REGISTRATION_REQUIRED") {
        navigate("/register?google=1", { replace: true });
        return;
      }
      // A refusal from our own rules (disabled account, two-step accounts) explains itself in error_description.
      setError(authErrorMessage(failed, params.get("error_description")) || t("تعذّر تسجيل الدخول. حاول مجددًا."));
      setParams({}, { replace: true });
      return;
    }
    const verified = params.get("verified");
    refreshUser()
      .then(goHome)
      .catch(() => {
        if (verified) setNotice(t("تم تأكيد بريدك الإلكتروني. سجّل الدخول الآن."));
        if (params.toString()) setParams({}, { replace: true });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fail = (err) => {
    setError(err.message || t("فشل تسجيل الدخول. تحقق من بياناتك."));
    setErrorCode(err.code || null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setErrorCode(null);
    setNotice("");
    if (!email.trim() || !password) {
      setError(t("يرجى إدخال البريد الإلكتروني وكلمة المرور."));
      return;
    }
    setLoading(true);
    try {
      const data = await login({ email: email.trim(), password });
      if (data.twoFactor) {
        setStep("code");
        setPassword("");
      } else {
        goHome(data.user);
      }
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (event) => {
    event.preventDefault();
    setError("");
    if (!code.trim()) {
      setError(useBackup ? t("أدخل أحد رموز الاحتياط.") : t("أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة."));
      return;
    }
    setLoading(true);
    try {
      const data = await verifyTwoFactor({ code, backup: useBackup, trustDevice });
      goHome(data.user);
    } catch (err) {
      fail(err);
      // The sign-in attempt expired: start again from the password.
      if (["INVALID_TWO_FACTOR_COOKIE", "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE"].includes(err.code)) { setStep("password"); setCode(""); }
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await resendVerification(email.trim());
      setError("");
      setErrorCode(null);
      setNotice(t("أرسلنا رابط التأكيد مجددًا إلى بريدك."));
    } catch (err) {
      fail(err);
    }
  };

  const google = async () => {
    setError("");
    try { await loginWithGoogle(); } catch (err) { fail(err); }
  };

  return (
    <main dir={dir} className="min-h-dvh bg-[#F3EFE5] font-[Cairo] text-[#1F2420]">
      <LanguageSwitch className="fixed end-4 top-4 z-50 bg-white shadow-sm" />
      <div className="grid min-h-dvh lg:grid-cols-[.82fr_1.18fr]">
        <aside className="relative hidden overflow-hidden bg-[#1F2420] p-10 text-[#F3EFE5] lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#EEA122]/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-[#5B7A52]/10 blur-3xl" />
          <Link to="/" className="relative z-10 flex w-fit items-center no-underline" dir="ltr">
            <Logo />
          </Link>
          <div className="relative z-10 max-w-md">
            <span className="mb-5 inline-flex rounded-full border border-[#EEA122]/30 bg-[#EEA122]/10 px-3 py-1 text-xs font-bold text-[#EEA122]">{t("أهلاً بعودتك")}</span>
            <h1 className="font-[Aref_Ruqaa] text-5xl leading-tight xl:text-6xl">{t("كل ما يحتاجه مطعمك، في مكان واحد.")}</h1>
            <p className="mt-6 text-sm leading-8 text-[#F3EFE5]/65">{t("سجّل الدخول لمتابعة الطلبات والطاولات والفواتير من نفس اللوحة التي اعتدت عليها.")}</p>
            <div className="mt-8 space-y-3 text-sm text-[#F3EFE5]/80">
              {[t("إدارة الطلبات لحظيًا"), t("قائمة رقمية عبر QR"), t("لوحات تحكم للأدوار المختلفة")].map((item) => (
                <div key={item} className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5B7A52]/20 text-[#EEA122]"><Check size={14} /></span>{item}</div>
              ))}
            </div>
          </div>
          <p className="relative z-10 text-xs text-[#F3EFE5]/35">{t("نظام إدارة مطاعم حديث · menuPilot")}</p>
        </aside>

        <section className="flex items-center justify-center px-4 pb-4 pt-16 sm:px-8 sm:pb-6 lg:py-10">
          <div className="w-full max-w-md">
            <div className="mb-4 flex items-center justify-between">
              <Link to="/" className="lg:hidden" dir="ltr" aria-label="menuPilot">
                <Logo on="light" height={34} />
              </Link>
              <Link to="/register" className="flex items-center gap-2 text-sm font-bold text-[#4B5147] transition hover:text-[#E67E22]">{t("ليس لديك حساب؟ إنشاء حساب")} <ArrowLeft size={16} /></Link>
            </div>

            <div className="rounded-[28px] border border-[#4B5147]/10 bg-white p-4 shadow-[0_24px_70px_rgba(31,36,32,.08)] sm:p-8 md:p-10">
              <div className="mb-4 text-center sm:mb-8">
                <span className="inline-flex rounded-full bg-[#EEA122]/10 px-3 py-1 text-xs font-bold text-[#E67E22]">{t("تسجيل الدخول")}</span>
                <h1 className="mt-3 font-[Aref_Ruqaa] text-4xl leading-tight text-[#1F2420] sm:mt-4 sm:text-5xl">{t("أهلاً بعودتك")}</h1>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-[#4B5147]/65 sm:mt-3">{t("أدخل بيانات حسابك للوصول إلى لوحة إدارة المطعم.")}</p>
              </div>

              {notice && <div role="status" className="mb-6 flex gap-2 rounded-2xl border border-[#5B7A52]/25 bg-[#5B7A52]/5 px-4 py-3 text-sm font-semibold text-[#3F5A38]"><CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />{notice}</div>}
              {error && (
                <div role="alert" className="mb-6 rounded-2xl border border-[#B33F32]/20 bg-[#B33F32]/5 px-4 py-3 text-sm font-semibold text-[#B33F32]">
                  {error}
                  {errorCode === "EMAIL_NOT_VERIFIED" && (
                    <button type="button" onClick={resend} className="mt-2 block text-xs font-black text-[#E67E22] underline underline-offset-4">{t("إرسال رابط التأكيد مجددًا")}</button>
                  )}
                </div>
              )}

              {step === "code" ? (
                <form onSubmit={submitCode} className="grid gap-3 sm:gap-5" noValidate>
                  <div className="flex gap-3 rounded-2xl bg-[#F3EFE5] p-4 text-sm leading-7 text-[#4B5147]">
                    <ShieldCheck size={22} className="mt-0.5 shrink-0 text-[#5B7A52]" aria-hidden="true" />
                    <span>{useBackup ? t("أدخل أحد رموز الاحتياط التي حفظتها عند تفعيل التحقق بخطوتين. كل رمز يعمل مرة واحدة.") : t("حسابك محمي بالتحقق بخطوتين. أدخل الرمز الظاهر في تطبيق المصادقة على هاتفك.")}</span>
                  </div>
                  <div>
                    <label htmlFor="code" className="mb-2 block text-sm font-bold text-[#1F2420]">{useBackup ? t("رمز الاحتياط") : t("رمز التحقق")}</label>
                    <div className="relative">
                      <KeyRound size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#4B5147]/35" />
                      <input id="code" dir="ltr" autoFocus value={code} onChange={(e) => setCode(e.target.value)}
                        inputMode={useBackup ? "text" : "numeric"} autoComplete="one-time-code" maxLength={useBackup ? 24 : 8}
                        placeholder={useBackup ? "xxxxx-xxxxx" : "123456"} className={`${inputClass} pr-11 text-center font-mono text-lg tracking-[.3em]`} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-[#4B5147]">
                    <input type="checkbox" checked={trustDevice} onChange={(e) => setTrustDevice(e.target.checked)} className="h-4 w-4 accent-[#EEA122]" />
                    {t("تذكّر هذا الجهاز لمدة 30 يومًا")}
                  </label>
                  <button type="submit" disabled={loading} className="w-full rounded-full bg-[#EEA122] px-5 py-4 text-sm font-black text-[#1F2420] shadow-lg shadow-[#EEA122]/15 transition hover:-translate-y-0.5 hover:bg-[#E67E22] disabled:cursor-not-allowed disabled:opacity-60">
                    {loading ? t("جارٍ التحقق...") : t("تأكيد الدخول")}
                  </button>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                    <button type="button" onClick={() => { setUseBackup((v) => !v); setCode(""); setError(""); }} className="text-[#E67E22] hover:text-[#EEA122]">
                      {useBackup ? t("استخدام رمز التطبيق") : t("لا أستطيع الوصول إلى هاتفي")}
                    </button>
                    <button type="button" onClick={() => { setStep("password"); setCode(""); setError(""); }} className="text-[#4B5147] hover:text-[#1F2420]">{t("الرجوع")}</button>
                  </div>
                </form>
              ) : (
              <form onSubmit={submit} className="grid gap-3 sm:gap-5" noValidate>
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-bold text-[#1F2420]">{t("البريد الإلكتروني")}</label>
                  <div className="relative">
                    <Mail size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#4B5147]/35" />
                    <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={`${inputClass} pr-11`} />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label htmlFor="password" className="block text-sm font-bold text-[#1F2420]">{t("كلمة المرور")}</label>
                    <Link to="/forgot-password" className="text-xs font-bold text-[#E67E22] no-underline hover:text-[#EEA122]">{t("نسيت كلمة المرور؟")}</Link>
                  </div>
                  <div className="relative">
                    <LockKeyhole size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#4B5147]/35" />
                    <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("أدخل كلمة المرور")} className={`${inputClass} px-12`} />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? t("إخفاء كلمة المرور") : t("إظهار كلمة المرور")} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#4B5147]/45 transition hover:bg-[#F3EFE5] hover:text-[#1F2420]">
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="mt-2 w-full rounded-full bg-[#EEA122] px-5 py-4 text-sm font-black text-[#1F2420] shadow-lg shadow-[#EEA122]/15 transition hover:-translate-y-0.5 hover:bg-[#E67E22] disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? t("جارٍ تسجيل الدخول...") : t("تسجيل الدخول")}
                </button>

                {config.googleEnabled && (
                  <>
                    <div className="flex items-center gap-3 text-xs font-bold text-[#4B5147]/55" aria-hidden="true">
                      <span className="h-px flex-1 bg-[#4B5147]/15" />{t("أو")}<span className="h-px flex-1 bg-[#4B5147]/15" />
                    </div>
                    <button type="button" onClick={google} className="flex w-full items-center justify-center gap-3 rounded-full border border-[#4B5147]/20 bg-white px-5 py-3.5 text-sm font-bold text-[#1F2420] transition hover:border-[#4B5147]/40 hover:bg-[#F3EFE5]">
                      <GoogleMark size={18} />
                      {t("الدخول بحساب Google")}
                    </button>
                  </>
                )}
              </form>
              )}
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}
