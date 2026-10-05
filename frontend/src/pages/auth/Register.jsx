import { useState } from "react";
import BrandLogo from "../../components/brand/Logo";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Gift, LockKeyhole, Mail, Store, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { t, dir } from "../../i18n";
import LanguageSwitch from "../../components/ui/LanguageSwitch";

const inputClass = "w-full rounded-2xl border border-[#5A6574]/20 bg-white px-4 py-3.5 text-sm text-[#172331] outline-none transition placeholder:text-[#5A6574]/70 focus:border-[#EEA122] focus:ring-4 focus:ring-[#EEA122]/10";

const RESTAURANT_TYPES = [["restaurant",t("مطعم")],["cafe",t("مقهى")],["fast-food",t("وجبات سريعة")],["other",t("أخرى")]];

// on="dark" for the dark side panel, default light for the mobile header.
const Logo = ({ on = "dark", height = 40 }) => <BrandLogo on={on} height={height} priority />;

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const planFromUrl = searchParams.get("plan");
  // The plan is chosen after the free trial, so registration starts with the restaurant.
  const [step, setStep] = useState(2);
  // A plan picked on the pricing page (?plan=) is kept as the owner's preference.
  const selectedPlan = planFromUrl || "pro";
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({ restaurantName: "", restaurantType: "", email: "", password: "", confirmPassword: "" });


  const change = (event) => {
    const { name, value } = event.target;
    setFormData((old) => ({ ...old, [name]: value }));
    setErrors((old) => ({ ...old, [name]: "", form: "" }));
  };

  const validateRestaurant = () => {
    const next = {};
    if (!formData.restaurantName.trim()) next.restaurantName = t("اسم المطعم مطلوب.");
    if (!formData.restaurantType) next.restaurantType = t("يرجى اختيار نوع المطعم.");
    setErrors(next);
    return !Object.keys(next).length;
  };

  const validateAccount = () => {
    const next = {};
    if (!formData.email.trim()) next.email = t("البريد الإلكتروني مطلوب.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) next.email = t("أدخل بريدًا إلكترونيًا صالحًا.");
    if (!formData.password) next.password = t("كلمة المرور مطلوبة.");
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(formData.password)) next.password = t("8 أحرف على الأقل، مع حرف كبير وصغير ورقم ورمز.");
    if (!formData.confirmPassword) next.confirmPassword = t("يرجى تأكيد كلمة المرور.");
    else if (formData.password !== formData.confirmPassword) next.confirmPassword = t("كلمتا المرور غير متطابقتين.");
    setErrors(next);
    return !Object.keys(next).length;
  };

  const submit = async () => {
    setErrors({});
    setLoading(true);
    try {
      await register({
        restaurantName: formData.restaurantName.trim(),
        restaurantType: formData.restaurantType,
        email: formData.email.trim(),
        password: formData.password,
        passwordConfirmation: formData.confirmPassword,
        plan: selectedPlan,
      });
      // No checkout at registration: the free trial starts right away.
      navigate("/welcome", { replace: true });
    } catch (error) {
      setErrors({ form: error?.message || t("تعذر إنشاء الحساب. حاول مرة أخرى.") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main dir={dir} className="min-h-screen bg-[#F3EFE5] font-[Cairo] text-[#172331]">
      <LanguageSwitch className="fixed end-4 top-4 z-50 bg-white shadow-sm" />
      <div className="grid min-h-screen lg:grid-cols-[.82fr_1.18fr]">
        <aside className="relative hidden overflow-hidden bg-[#172331] p-10 text-[#F3EFE5] lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#EEA122]/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-[#4B6A8A]/10 blur-3xl" />
          <Link to="/" className="relative z-10 flex w-fit items-center no-underline" dir="ltr">
            <Logo />
          </Link>
          <div className="relative z-10 max-w-md">
            <span className="mb-5 inline-flex rounded-full border border-[#EEA122]/30 bg-[#EEA122]/10 px-3 py-1 text-xs font-bold text-[#EEA122]">{t("ابدأ الآن")}</span>
            <h1 className="font-[Aref_Ruqaa] text-5xl leading-tight xl:text-6xl">{t("حوّل إدارة مطعمك إلى تجربة أبسط.")}</h1>
            <p className="mt-6 text-sm leading-8 text-[#F3EFE5]/65">{t("من الطلب عبر QR إلى المطبخ والكاشير، menuPilot يجمع دورة الطلب كاملة في مكان واحد.")}</p>
            <div className="mt-8 space-y-3 text-sm text-[#F3EFE5]/80">
              {[t("إدارة الطلبات لحظيًا"), t("قائمة رقمية عبر QR"), t("لوحات تحكم للأدوار المختلفة")].map((item) => (
                <div key={item} className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4B6A8A]/20 text-[#EEA122]"><Check size={14} /></span>{item}</div>
              ))}
            </div>
          </div>
          <p className="relative z-10 text-xs text-[#F3EFE5]/35">{t("نظام إدارة مطاعم حديث · menuPilot")}</p>
        </aside>

        <section className="flex min-h-screen items-start justify-center px-4 py-6 sm:px-8 sm:py-10">
          <div className="w-full max-w-2xl">
            <div className="mb-7 flex items-center justify-between">
              <Link to="/" className="lg:hidden" dir="ltr" aria-label="menuPilot">
                <Logo on="light" height={34} />
              </Link>
              <Link to="/login" className="flex items-center gap-2 text-sm font-bold text-[#5A6574] transition hover:text-[#E67E22]">{t("لديك حساب؟ تسجيل الدخول")} <ArrowLeft size={16} /></Link>
            </div>

            <div className="mb-7 flex items-center justify-center gap-0">
              {[t("المطعم"), t("الحساب"), t("المراجعة")].map((label, index) => {
                const number = index + 2;
                const active = step >= number;
                return (
                  <div key={label} className="flex items-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-black transition ${active ? "border-[#EEA122] bg-[#EEA122] text-[#172331]" : "border-[#5A6574]/20 bg-white text-[#5A6574]"}`}>{active && step > number ? <Check size={15} /> : number - 1}</span>
                      <span className={`text-xs font-bold ${active ? "text-[#172331]" : "text-[#5A6574]"}`}>{label}</span>
                    </div>
                    {number < 4 && <span className={`mx-1 h-px w-8 sm:w-12 ${step > number ? "bg-[#EEA122]" : "bg-[#5A6574]/15"}`} />}
                  </div>
                );
              })}
            </div>

            <div className="rounded-[28px] border border-[#5A6574]/10 bg-white p-5 shadow-[0_24px_70px_rgba(23,35,49,.08)] sm:p-8 md:p-10">
              {errors.form && <div className="mb-6 rounded-2xl border border-[#B33F32]/20 bg-[#B33F32]/5 px-4 py-3 text-sm font-semibold text-[#B33F32]">{errors.form}</div>}

              {/* Step 1 (plan choice) removed: the free trial comes first; plans are chosen after it. */}

              {step === 2 && <StepFrame eyebrow={t("الخطوة 1 من 3")} title={t("معلومات المطعم")} description={t("أخبرنا قليلًا عن المطعم لنجهز حسابك.")}>
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#EEA122]/25 bg-[#EEA122]/[0.07] p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEA122] text-[#172331]"><Gift size={19} aria-hidden="true" /></span>
                  <div className="min-w-0 text-sm leading-6">
                    <p className="font-extrabold text-[#172331]">{t("تجربة مجانية لمدة 14 يومًا")}</p>
                    <p className="text-[#5A6574]">{t("كل الميزات مفتوحة، ولا نطلب أي بطاقة دفع. تختار خطتك بعد التجربة إن أردت الاستمرار.")}</p>
                    <a href="/#pricing" className="mt-1 inline-block text-xs font-bold text-[#B35A0F] underline-offset-4 hover:underline">{t("الأسعار بعد التجربة")}</a>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={t("اسم المطعم")} name="restaurantName" value={formData.restaurantName} onChange={change} placeholder={t("مثال: مطعم الزيتونة")} icon={Store} error={errors.restaurantName} />
                  <Field label={t("نوع المطعم")} name="restaurantType" value={formData.restaurantType} onChange={change} placeholder={t("اختر النوع")} icon={Store} error={errors.restaurantType} select options={RESTAURANT_TYPES} />
                </div>
                <Actions onBack={() => navigate("/")} backLabel={t("الرئيسية")} onNext={() => validateRestaurant() && setStep(3)} />
              </StepFrame>}

              {step === 3 && <StepFrame eyebrow={t("الخطوة 2 من 3")} title={t("معلومات الحساب")} description={t("أنشئ بيانات الدخول الخاصة بحسابك.")}>
                <div className="grid gap-5">
                  <Field label={t("البريد الإلكتروني")} name="email" type="email" value={formData.email} onChange={change} placeholder="you@example.com" icon={Mail} error={errors.email} />
                  <PasswordField label={t("كلمة المرور")} name="password" value={formData.password} onChange={change} placeholder={t("أنشئ كلمة مرور قوية")} visible={showPassword} onToggle={() => setShowPassword((v) => !v)} error={errors.password} />
                  <PasswordField label={t("تأكيد كلمة المرور")} name="confirmPassword" value={formData.confirmPassword} onChange={change} placeholder={t("أعد كتابة كلمة المرور")} visible={showConfirm} onToggle={() => setShowConfirm((v) => !v)} error={errors.confirmPassword} />
                </div>
                <Actions onBack={() => setStep(2)} onNext={() => validateAccount() && setStep(4)} />
              </StepFrame>}

              {step === 4 && <StepFrame eyebrow={t("الخطوة 3 من 3")} title={t("راجع بياناتك")} description={t("تأكد من صحة المعلومات قبل إنشاء الحساب.")}>
                <div className="overflow-hidden rounded-2xl border border-[#5A6574]/10 bg-[#F3EFE5]/35">
                  {[[t("التجربة"), t("14 يومًا مجانًا، تبدأ اليوم")], [t("المطعم"), formData.restaurantName], [t("النوع"), RESTAURANT_TYPES.find(([id]) => id === formData.restaurantType)?.[1] || formData.restaurantType], [t("البريد"), formData.email]].map(([label, value], index) => <div key={label} className={`grid grid-cols-[90px_1fr] gap-4 px-4 py-4 text-sm ${index < 3 ? "border-b border-[#5A6574]/10" : ""}`}><span className="text-[#5A6574]/50">{label}</span><strong className="break-words">{value || "—"}</strong></div>)}
                </div>
                <div className="mt-6 flex gap-3">
                  <button type="button" onClick={() => setStep(3)} className={SECONDARY}>{t("رجوع")}</button>
                  <button type="button" disabled={loading} onClick={submit} aria-busy={loading || undefined} className={`${PRIMARY} flex-[2]`}>{loading ? t("جارٍ إنشاء الحساب…") : <>{t("ابدأ التجربة المجانية")} <ArrowLeft size={17} aria-hidden="true" /></>}</button>
                </div>
              </StepFrame>}
            </div>
            <p className="mt-5 text-center text-xs text-[#5A6574]/45">{t("بإنشاء الحساب تبدأ تجربة مجانية لمدة 14 يومًا، ولن نطلب منك أي بيانات دفع.")}</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function StepFrame({ eyebrow, title, description, children }) {
  return <div><div className="mb-6 text-center"><span className="inline-flex rounded-full bg-[#EEA122]/10 px-3 py-1 text-xs font-bold text-[#B35A0F]">{eyebrow}</span><h1 className="mt-3 text-2xl font-extrabold leading-tight text-[#172331] sm:text-3xl">{title}</h1><p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-[#5A6574]">{description}</p></div>{children}</div>;
}

function Field({ label, name, type = "text", value, onChange, placeholder, icon: Icon, error, select, options = [] }) {
  return <div><label htmlFor={name} className="mb-2 block text-sm font-bold text-[#172331]">{label}</label><div className="relative">{Icon && <Icon size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#5A6574]/35" />}{select ? <select id={name} name={name} value={value} onChange={onChange} className={`${inputClass} appearance-none pr-11`}><option value="">{placeholder}</option>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select> : <input id={name} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} className={`${inputClass} pr-11`} />}</div>{error && <p className="mt-2 text-xs font-semibold text-[#B33F32]">{error}</p>}</div>;
}

function PasswordField({ label, name, value, onChange, placeholder, visible, onToggle, error }) {
  return <div><label htmlFor={name} className="mb-2 block text-sm font-bold text-[#172331]">{label}</label><div className="relative"><LockKeyhole size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#5A6574]/35" /><input id={name} name={name} type={visible ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} className={`${inputClass} px-12`} /><button type="button" onClick={onToggle} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#5A6574]/45 transition hover:bg-[#F3EFE5] hover:text-[#172331]" aria-label={visible ? t("إخفاء كلمة المرور") : t("إظهار كلمة المرور")}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{error && <p className="mt-2 text-xs font-semibold text-[#B33F32]">{error}</p>}</div>;
}

const PRIMARY = "inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#EEA122] px-5 text-sm font-black text-[#172331] transition hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";
const SECONDARY = "inline-flex h-12 flex-1 items-center justify-center rounded-2xl border border-[#5A6574]/20 bg-white px-5 text-sm font-bold text-[#172331] transition hover:border-[#EEA122]";

function Actions({ onBack, onNext, backLabel = t("رجوع") }) {
  return <div className="mt-7 flex gap-3"><button type="button" onClick={onBack} className={SECONDARY}>{backLabel}</button><button type="button" onClick={onNext} className={`${PRIMARY} flex-[2]`}>{t("التالي")} <ArrowLeft size={17} aria-hidden="true" /></button></div>;
}

function PrimaryButton({ onClick, children }) {
  return <button type="button" onClick={onClick} className="mt-7 w-full rounded-full bg-[#EEA122] px-5 py-4 text-sm font-black text-[#172331] shadow-lg shadow-[#EEA122]/15 transition hover:-translate-y-0.5 hover:bg-[#E67E22]">{children}</button>;
}
