import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  Utensils,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { openSession } from "../../api/sessions";

const fieldBase =
  "w-full rounded-2xl border bg-white px-12 py-3.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/40 focus:border-copper focus:ring-4 focus:ring-copper/10";

export default function ScanEntry() {
  const { tableCode } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationChecking, setLocationChecking] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < 2) {
      setError("اكتب اسمًا صحيحًا للمتابعة.");
      return;
    }

    if (trimmedPhone.length < 7) {
      setError("أدخل رقم جوال صحيحًا للمتابعة.");
      return;
    }

    setLoading(true);
    setLocationChecking(true);

    try {
      const session = await openSession({
        tableCode,
        name: trimmedName,
        phone: trimmedPhone,
      });

      if (!session?.id) {
        throw new Error("تم فتح الجلسة لكن لم يصل رقم الجلسة. حاول مرة أخرى.");
      }

      navigate(`/t/${tableCode}/menu?session=${encodeURIComponent(session.id)}`, {
        replace: true,
      });
    } catch (err) {
      if (err.code === "RESTAURANT_LOCATION_NOT_CONFIGURED") {
        setError("المطعم لم يحدد موقعه بعد. يجب على صاحب المطعم ضبط موقع المطعم من الإعدادات قبل استقبال طلبات QR.");
      } else if (err.code === "LOCATION_SECURE_CONTEXT_REQUIRED") {
        setError(err.message);
      } else if (err.code === "LOCATION_REQUIRED" || err.status === 403) {
        setError(err.message || "يجب السماح بتحديد موقعك وأن تكون داخل المطعم لفتح هذه الطاولة.");
      } else if (err.status === 409 || err.code === "TABLE_ALREADY_OCCUPIED") {
        setError("هذه الطاولة مستخدمة حاليًا. اطلب مساعدة أحد أفراد الطاقم للمتابعة.");
      } else if (err.status === 404) {
        setError("رمز QR غير صالح أو أن هذه الطاولة لم تعد موجودة.");
      } else {
        setError(err.message || "تعذر بدء الجلسة. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.");
      }
    } finally {
      setLoading(false);
      setLocationChecking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F3EFE5] text-[#1F2420]" dir="rtl">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-[#4B5147]/10 bg-white shadow-[0_30px_100px_rgba(31,36,32,.12)] lg:min-h-[680px] lg:grid-cols-[.92fr_1.08fr]">
          <aside className="relative hidden overflow-hidden bg-[#1F2420] p-10 text-[#F3EFE5] lg:flex lg:flex-col lg:justify-between xl:p-14">
            <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-[#EEA122]/15 blur-3xl" />
            <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#5B7A52]/20 blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-3" dir="ltr">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEA122] font-black text-[#1F2420] shadow-lg">
                  m
                </span>
                <span className="text-xl font-black">menuPilot</span>
              </div>

              <div className="mt-20 max-w-md">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#EEA122]/25 bg-[#EEA122]/10 px-3 py-1.5 text-xs font-bold text-[#EEA122]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#EEA122]" />
                  طاولة {tableCode}
                </span>
                <h1 className="mt-6 font-[Aref_Ruqaa] text-5xl leading-tight xl:text-6xl">
                  أهلاً بك على الطاولة.
                </h1>
                <p className="mt-6 text-sm leading-8 text-[#F3EFE5]/60">
                  أدخل بياناتك، نتحقق من وجودك داخل المطعم، ثم نفتح لك القائمة مباشرة.
                  لا حسابات ولا تطبيقات إضافية.
                </p>
              </div>
            </div>

            <div className="relative z-10 space-y-4 text-sm">
              <Feature icon={MapPin} text="التحقق من موقع الطاولة" />
              <Feature icon={ShieldCheck} text="جلسة مرتبطة بطاولتك" />
              <Feature icon={CheckCircle2} text="الطلب مباشرة من القائمة" />
            </div>
          </aside>

          <section className="flex items-center justify-center p-5 sm:p-8 lg:p-12">
            <div className="w-full max-w-xl">
              <div className="mb-8 flex items-center justify-between lg:hidden">
                <div className="flex items-center gap-2" dir="ltr">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEA122] font-black">
                    m
                  </span>
                  <span className="font-black">menuPilot</span>
                </div>
                <span className="rounded-full bg-[#EEA122]/10 px-3 py-1.5 text-xs font-bold text-[#9A6410]">
                  طاولة {tableCode}
                </span>
              </div>

              <div className="mb-8">
                <div className="mb-4 flex items-center gap-2 text-xs font-bold text-[#5B7A52]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5B7A52]/10">
                    <Check size={14} />
                  </span>
                  الخطوة 1 من 1
                </div>
                <h2 className="font-[Aref_Ruqaa] text-4xl leading-tight sm:text-5xl">
                  ابدأ طلبك
                </h2>
                <p className="mt-3 max-w-md text-sm leading-7 text-[#4B5147]/65">
                  نحتاج اسمك ورقم جوالك فقط لتشغيل جلسة الطلب على هذه الطاولة.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-6 flex items-start gap-3 rounded-2xl border border-[#B33F32]/15 bg-[#B33F32]/5 p-4 text-sm leading-6 text-[#9B352B]"
                >
                  <AlertCircle className="mt-0.5 shrink-0" size={19} />
                  <div className="min-w-0">
                    <p className="font-bold">تعذر بدء الجلسة</p>
                    <p className="mt-1">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <Field
                  id="customer-name"
                  label="الاسم"
                  value={name}
                  onChange={setName}
                  placeholder="مثلاً: أحمد"
                  icon={UserRound}
                  autoComplete="name"
                  disabled={loading}
                />

                <Field
                  id="customer-phone"
                  label="رقم الجوال"
                  value={phone}
                  onChange={setPhone}
                  placeholder="05XXXXXXXX"
                  icon={Phone}
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  disabled={loading}
                />

                <div className="rounded-2xl border border-[#EEA122]/20 bg-[#EEA122]/5 p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEA122]/15 text-[#B16E0B]">
                      <MapPin size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-bold">تحقق سريع من موقعك</p>
                      <p className="mt-1 text-xs leading-6 text-[#4B5147]/65">
                        نستخدم موقع جهازك مرة واحدة للتأكد أنك داخل نطاق المطعم. لا تحتاج إلى إنشاء حساب.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1F2420] px-5 py-4 text-sm font-bold text-[#F3EFE5] shadow-[0_12px_30px_rgba(31,36,32,.16)] transition hover:-translate-y-0.5 hover:bg-[#30372F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {locationChecking ? "نتحقق من موقعك…" : "جاري فتح الجلسة…"}
                    </>
                  ) : (
                    <>
                      دخول إلى القائمة
                      <ArrowLeft size={18} />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] leading-5 text-[#4B5147]/45">
                <ShieldCheck size={14} />
                بياناتك تستخدم فقط لتشغيل جلسة الطلب على هذه الطاولة.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ id, label, value, onChange, placeholder, icon: Icon, type = "text", ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-[#1F2420]">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#4B5147]/40" size={18} />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${fieldBase} border-[#4B5147]/12 disabled:bg-[#F3EFE5]/50`}
          required
          {...props}
        />
      </div>
    </div>
  );
}

function Feature({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3 text-[#F3EFE5]/70">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3EFE5]/5 text-[#EEA122]">
        <Icon size={17} />
      </span>
      {text}
    </div>
  );
}
