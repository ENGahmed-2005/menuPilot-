import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, Store, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const plans = [
  { id: "basic", name: "الأساسية", price: "$19", description: "للمطاعم الصغيرة التي تبدأ رحلتها.", featured: false },
  { id: "pro", name: "الاحترافية", price: "$39", description: "للمطاعم المتنامية التي تحتاج تحكمًا أكبر.", featured: true },
  { id: "premium", name: "المميزة", price: "$69", description: "للمطاعم التي تريد التجربة الكاملة.", featured: false },
];

const inputClass = "w-full rounded-2xl border border-[#4B5147]/20 bg-white px-4 py-3.5 text-sm text-[#1F2420] outline-none transition placeholder:text-[#4B5147]/45 focus:border-[#EEA122] focus:ring-4 focus:ring-[#EEA122]/10";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const planFromUrl = searchParams.get("plan");
  const [step, setStep] = useState(planFromUrl ? 2 : 1);
  const [selectedPlan, setSelectedPlan] = useState(planFromUrl || "pro");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({ restaurantName: "", restaurantType: "", email: "", password: "", confirmPassword: "" });

  const currentPlan = plans.find((plan) => plan.id === selectedPlan) || plans[0];

  const change = (event) => {
    const { name, value } = event.target;
    setFormData((old) => ({ ...old, [name]: value }));
    setErrors((old) => ({ ...old, [name]: "", form: "" }));
  };

  const validateRestaurant = () => {
    const next = {};
    if (!formData.restaurantName.trim()) next.restaurantName = "اسم المطعم مطلوب.";
    if (!formData.restaurantType) next.restaurantType = "يرجى اختيار نوع المطعم.";
    setErrors(next);
    return !Object.keys(next).length;
  };

  const validateAccount = () => {
    const next = {};
    if (!formData.email.trim()) next.email = "البريد الإلكتروني مطلوب.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) next.email = "أدخل بريدًا إلكترونيًا صالحًا.";
    if (!formData.password) next.password = "كلمة المرور مطلوبة.";
    else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(formData.password)) next.password = "8 أحرف على الأقل، مع حرف كبير وصغير ورقم ورمز.";
    if (!formData.confirmPassword) next.confirmPassword = "يرجى تأكيد كلمة المرور.";
    else if (formData.password !== formData.confirmPassword) next.confirmPassword = "كلمتا المرور غير متطابقتين.";
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
      navigate(`/checkout?plan=${selectedPlan}`, { replace: true });
    } catch (error) {
      setErrors({ form: error?.message || "تعذر إنشاء الحساب. حاول مرة أخرى." });
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
            <span className="mb-5 inline-flex rounded-full border border-[#EEA122]/30 bg-[#EEA122]/10 px-3 py-1 text-xs font-bold text-[#EEA122]">ابدأ الآن</span>
            <h1 className="font-[Aref_Ruqaa] text-5xl leading-tight xl:text-6xl">حوّل إدارة مطعمك إلى تجربة أبسط.</h1>
            <p className="mt-6 text-sm leading-8 text-[#F3EFE5]/65">من الطلب عبر QR إلى المطبخ والكاشير، menuPilot يجمع دورة الطلب كاملة في مكان واحد.</p>
            <div className="mt-8 space-y-3 text-sm text-[#F3EFE5]/80">
              {["إدارة الطلبات لحظيًا", "قائمة رقمية عبر QR", "لوحات تحكم للأدوار المختلفة"].map((item) => (
                <div key={item} className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5B7A52]/20 text-[#EEA122]"><Check size={14} /></span>{item}</div>
              ))}
            </div>
          </div>
          <p className="relative z-10 text-xs text-[#F3EFE5]/35">نظام إدارة مطاعم حديث · menuPilot</p>
        </aside>

        <section className="flex min-h-screen items-start justify-center px-4 py-6 sm:px-8 sm:py-10">
          <div className="w-full max-w-2xl">
            <div className="mb-7 flex items-center justify-between">
              <Link to="/" className="text-lg font-black text-[#1F2420] no-underline lg:hidden" dir="ltr">menuPilot</Link>
              <Link to="/login" className="flex items-center gap-2 text-sm font-bold text-[#4B5147] transition hover:text-[#E67E22]">لديك حساب؟ تسجيل الدخول <ArrowLeft size={16} /></Link>
            </div>

            <div className="mb-7 flex items-center justify-center gap-0">
              {["الخطة", "المطعم", "الحساب", "المراجعة"].map((label, index) => {
                const number = index + 1;
                const active = step >= number;
                return (
                  <div key={label} className="flex items-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs font-black transition ${active ? "border-[#EEA122] bg-[#EEA122] text-[#1F2420]" : "border-[#4B5147]/20 bg-white text-[#4B5147]/45"}`}>{active && step > number ? <Check size={15} /> : number}</span>
                      <span className={`hidden text-[10px] font-bold sm:block ${active ? "text-[#1F2420]" : "text-[#4B5147]/40"}`}>{label}</span>
                    </div>
                    {number < 4 && <span className={`mx-1 h-px w-8 sm:w-12 ${step > number ? "bg-[#EEA122]" : "bg-[#4B5147]/15"}`} />}
                  </div>
                );
              })}
            </div>

            <div className="rounded-[28px] border border-[#4B5147]/10 bg-white p-5 shadow-[0_24px_70px_rgba(31,36,32,.08)] sm:p-8 md:p-10">
              {errors.form && <div className="mb-6 rounded-2xl border border-[#B33F32]/20 bg-[#B33F32]/5 px-4 py-3 text-sm font-semibold text-[#B33F32]">{errors.form}</div>}

              {step === 1 && <StepFrame eyebrow="الاشتراك" title="اختر خطتك" description="ابدأ بالخطة المناسبة لحجم مطعمك ويمكنك التغيير لاحقًا.">
                <div className="grid gap-4 md:grid-cols-3">
                  {plans.map((plan) => {
                    const selected = selectedPlan === plan.id;
                    return <button key={plan.id} type="button" onClick={() => setSelectedPlan(plan.id)} className={`relative rounded-2xl border p-5 text-right transition duration-200 hover:-translate-y-1 ${selected ? "border-[#EEA122] bg-[#EEA122]/5 shadow-[0_12px_30px_rgba(238,161,34,.12)]" : "border-[#4B5147]/10 bg-[#F3EFE5]/45 hover:border-[#EEA122]/40"}`}>
                      {plan.featured && <span className="absolute -top-3 right-4 rounded-full bg-[#1F2420] px-3 py-1 text-[10px] font-bold text-[#EEA122]">الأكثر اختيارًا</span>}
                      <span className="text-lg font-black">{plan.name}</span>
                      <div className="mt-3 text-2xl font-black">{plan.price}<span className="text-xs font-normal text-[#4B5147]/50"> / شهريًا</span></div>
                      <p className="mt-3 text-xs leading-6 text-[#4B5147]/65">{plan.description}</p>
                      <span className={`mt-4 block h-1.5 rounded-full ${selected ? "bg-[#EEA122]" : "bg-[#4B5147]/10"}`} />
                    </button>;
                  })}
                </div>
                <PrimaryButton onClick={() => setStep(2)}>متابعة <ArrowLeft size={17} /></PrimaryButton>
              </StepFrame>}

              {step === 2 && <StepFrame eyebrow={`الخطة ${currentPlan.name}`} title="معلومات المطعم" description="أخبرنا قليلًا عن المطعم لنجهز حسابك.">
                <div className="mb-6 flex items-center justify-between rounded-2xl border border-[#EEA122]/20 bg-[#EEA122]/5 p-4">
                  <div><p className="text-xs text-[#4B5147]/50">الخطة المختارة</p><strong className="mt-1 block">{currentPlan.name} · {currentPlan.price}/شهريًا</strong></div>
                  <button type="button" onClick={() => setStep(1)} className="text-xs font-black text-[#E67E22]">تغيير</button>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="اسم المطعم" name="restaurantName" value={formData.restaurantName} onChange={change} placeholder="مثال: مطعم الزيتونة" icon={Store} error={errors.restaurantName} />
                  <Field label="نوع المطعم" name="restaurantType" value={formData.restaurantType} onChange={change} placeholder="اختر النوع" icon={Store} error={errors.restaurantType} select options={[["restaurant","مطعم"],["cafe","مقهى"],["fast-food","وجبات سريعة"],["other","أخرى"]]} />
                </div>
                <Actions onBack={() => planFromUrl ? navigate("/pricing") : setStep(1)} onNext={() => validateRestaurant() && setStep(3)} />
              </StepFrame>}

              {step === 3 && <StepFrame eyebrow={`الخطة ${currentPlan.name}`} title="معلومات الحساب" description="أنشئ بيانات الدخول الخاصة بحسابك.">
                <div className="grid gap-5">
                  <Field label="البريد الإلكتروني" name="email" type="email" value={formData.email} onChange={change} placeholder="you@example.com" icon={Mail} error={errors.email} />
                  <PasswordField label="كلمة المرور" name="password" value={formData.password} onChange={change} placeholder="أنشئ كلمة مرور قوية" visible={showPassword} onToggle={() => setShowPassword((v) => !v)} error={errors.password} />
                  <PasswordField label="تأكيد كلمة المرور" name="confirmPassword" value={formData.confirmPassword} onChange={change} placeholder="أعد كتابة كلمة المرور" visible={showConfirm} onToggle={() => setShowConfirm((v) => !v)} error={errors.confirmPassword} />
                </div>
                <Actions onBack={() => setStep(2)} onNext={() => validateAccount() && setStep(4)} />
              </StepFrame>}

              {step === 4 && <StepFrame eyebrow="الخطوة الأخيرة" title="راجع بياناتك" description="تأكد من صحة المعلومات قبل إنشاء الحساب.">
                <div className="overflow-hidden rounded-2xl border border-[#4B5147]/10 bg-[#F3EFE5]/35">
                  {[['الخطة', `${currentPlan.name} · ${currentPlan.price}/شهريًا`], ['المطعم', formData.restaurantName], ['النوع', formData.restaurantType], ['البريد', formData.email]].map(([label, value], index) => <div key={label} className={`grid grid-cols-[90px_1fr] gap-4 px-4 py-4 text-sm ${index < 3 ? "border-b border-[#4B5147]/10" : ""}`}><span className="text-[#4B5147]/50">{label}</span><strong className="break-words">{value || "—"}</strong></div>)}
                </div>
                <div className="mt-6 flex gap-3">
                  <button type="button" onClick={() => setStep(3)} className="flex-1 rounded-full border border-[#4B5147]/15 bg-white px-5 py-3.5 text-sm font-bold text-[#1F2420] transition hover:border-[#EEA122]">رجوع</button>
                  <button type="button" disabled={loading} onClick={submit} className="flex-[2] rounded-full bg-[#EEA122] px-5 py-3.5 text-sm font-black text-[#1F2420] transition hover:bg-[#E67E22] disabled:cursor-not-allowed disabled:opacity-60">{loading ? "جارٍ إنشاء الحساب..." : "المتابعة إلى الدفع"}</button>
                </div>
              </StepFrame>}
            </div>
            <p className="mt-5 text-center text-xs text-[#4B5147]/45">بإنشاء الحساب، أنت تبدأ استخدام menuPilot وفق خطتك المختارة.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function StepFrame({ eyebrow, title, description, children }) {
  return <div><div className="mb-8 text-center"><span className="inline-flex rounded-full bg-[#EEA122]/10 px-3 py-1 text-xs font-bold text-[#E67E22]">{eyebrow}</span><h1 className="mt-4 font-[Aref_Ruqaa] text-4xl leading-tight text-[#1F2420] sm:text-5xl">{title}</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#4B5147]/65">{description}</p></div>{children}</div>;
}

function Field({ label, name, type = "text", value, onChange, placeholder, icon: Icon, error, select, options = [] }) {
  return <div><label htmlFor={name} className="mb-2 block text-sm font-bold text-[#1F2420]">{label}</label><div className="relative">{Icon && <Icon size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#4B5147]/35" />}{select ? <select id={name} name={name} value={value} onChange={onChange} className={`${inputClass} appearance-none pr-11`}><option value="">{placeholder}</option>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select> : <input id={name} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} className={`${inputClass} pr-11`} />}</div>{error && <p className="mt-2 text-xs font-semibold text-[#B33F32]">{error}</p>}</div>;
}

function PasswordField({ label, name, value, onChange, placeholder, visible, onToggle, error }) {
  return <div><label htmlFor={name} className="mb-2 block text-sm font-bold text-[#1F2420]">{label}</label><div className="relative"><LockKeyhole size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#4B5147]/35" /><input id={name} name={name} type={visible ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} className={`${inputClass} px-12`} /><button type="button" onClick={onToggle} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#4B5147]/45 transition hover:bg-[#F3EFE5] hover:text-[#1F2420]" aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{error && <p className="mt-2 text-xs font-semibold text-[#B33F32]">{error}</p>}</div>;
}

function Actions({ onBack, onNext }) {
  return <div className="mt-7 flex gap-3"><button type="button" onClick={onBack} className="flex-1 rounded-full border border-[#4B5147]/15 bg-white px-5 py-3.5 text-sm font-bold transition hover:border-[#EEA122]">رجوع</button><button type="button" onClick={onNext} className="flex-[2] rounded-full bg-[#EEA122] px-5 py-3.5 text-sm font-black text-[#1F2420] transition hover:bg-[#E67E22]">التالي <ArrowLeft size={17} className="mr-2 inline" /></button></div>;
}

function PrimaryButton({ onClick, children }) {
  return <button type="button" onClick={onClick} className="mt-7 w-full rounded-full bg-[#EEA122] px-5 py-4 text-sm font-black text-[#1F2420] shadow-lg shadow-[#EEA122]/15 transition hover:-translate-y-0.5 hover:bg-[#E67E22]">{children}</button>;
}
