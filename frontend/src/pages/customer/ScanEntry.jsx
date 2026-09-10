import { useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, MapPin, Phone, UserRound, Utensils } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { openSession } from "../../api/sessions";

export default function ScanEntry() {
  const { tableCode } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault(); setError("");
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedPhone) { setError("يرجى إدخال الاسم ورقم الهاتف للمتابعة."); return; }

    setLoading(true);
    try {
      const session = await openSession({ tableCode, name: trimmedName, phone: trimmedPhone });
      if (!session?.id) throw new Error("تعذّر الحصول على رقم جلسة الطعام.");
      navigate(`/t/${tableCode}/menu?session=${encodeURIComponent(session.id)}`, { replace: true });
    } catch (err) {
      if (err.code === "LOCATION_REQUIRED" || err.status === 403) {
        setError("لأسباب أمنية، يجب السماح بتحديد موقعك وأن تكون داخل المطعم لفتح هذه الطاولة.");
      } else if (err.status === 409) {
        setError("هذه الطاولة لديها جلسة نشطة بالفعل. الرجاء طلب مساعدة الطاقم.");
      } else {
        setError(err.message || "تعذّر بدء جلستك. الرجاء المحاولة مرة أخرى.");
      }
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-ink text-paper" dir="rtl">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col lg:flex-row">
        <section className="relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12"><div className="absolute -right-28 -top-28 h-72 w-72 rounded-full bg-copper/20 blur-3xl"/><div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-herb/20 blur-3xl"/><div className="relative"><div className="mb-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-copper text-ink shadow-lg"><Utensils size={22}/></div><p className="text-sm font-semibold tracking-[0.2em] text-copper">MENUPILOT</p><h1 className="mt-5 max-w-lg font-display text-6xl leading-tight">طلبك يبدأ من هنا.</h1><p className="mt-5 max-w-md text-base leading-8 text-paper/60">أدخل بياناتك مرة واحدة، ثم تصفح القائمة واطلب مباشرة من طاولتك بدون تطبيق.</p></div><div className="relative flex items-center gap-3 text-sm text-paper/50"><CheckCircle2 size={18} className="text-herb"/>تجربة سريعة • بدون تسجيل حساب</div></section>
        <section className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:bg-paper-2 lg:text-ink"><div className="w-full max-w-md"><div className="mb-6 flex items-center gap-3 lg:hidden"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-copper text-ink"><Utensils size={19}/></div><div><p className="text-xs font-bold tracking-[0.18em] text-copper">MENUPILOT</p><p className="text-xs text-paper/50">القائمة الرقمية</p></div></div><div className="rounded-[2rem] border border-ink/10 bg-paper-2 p-6 text-ink shadow-2xl sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="mb-8"><span className="inline-flex items-center rounded-full bg-copper/10 px-3 py-1.5 text-xs font-bold text-copper-deep">طاولة {tableCode}</span><h2 className="mt-4 font-display text-4xl sm:text-5xl">أهلاً بك!</h2><p className="mt-3 text-sm leading-7 text-ink-soft">أدخل بياناتك لنفتح جلسة طاولتك ونجهز قائمتك.</p></div>
          {error && <div role="alert" className="mb-5 flex gap-3 rounded-2xl border border-brick/15 bg-brick/5 p-4 text-sm leading-6 text-brick"><AlertCircle className="mt-0.5 shrink-0" size={18}/><span>{error}</span></div>}
          <div className="mb-5 flex gap-3 rounded-2xl border border-copper/15 bg-copper/5 p-4 text-xs leading-6 text-ink-soft"><MapPin size={18} className="mt-1 shrink-0 text-copper"/><span>يتم التحقق من موقعك عند فتح الجلسة. الاحتفاظ بصورة QR وحدها لا يكفي لفتح الطاولة من خارج المطعم.</span></div>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate><div><label htmlFor="customer-name" className="mb-2 block text-sm font-semibold">الاسم</label><div className="relative"><UserRound className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft/50" size={18}/><input id="customer-name" value={name} onChange={(e)=>setName(e.target.value)} required autoComplete="name" placeholder="مثلاً: أحمد" className="w-full rounded-2xl border border-ink/10 bg-white px-12 py-3.5 text-sm outline-none transition focus:border-copper focus:ring-4 focus:ring-copper/10"/></div></div><div><label htmlFor="customer-phone" className="mb-2 block text-sm font-semibold">رقم الهاتف</label><div className="relative"><Phone className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft/50" size={18}/><input id="customer-phone" type="tel" value={phone} onChange={(e)=>setPhone(e.target.value)} required autoComplete="tel" inputMode="tel" placeholder="05XXXXXXXX" className="w-full rounded-2xl border border-ink/10 bg-white px-12 py-3.5 text-sm outline-none transition focus:border-copper focus:ring-4 focus:ring-copper/10"/></div></div><button type="submit" disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-4 text-sm font-bold text-paper shadow-lg transition hover:-translate-y-0.5 hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50">{loading ? "جارِ التحقق وفتح الجلسة…" : "ابدأ الطلب"}{!loading && <ArrowLeft size={18}/>}</button></form>
          <p className="mt-6 text-center text-xs leading-5 text-ink-soft/60">بإكمال المتابعة، نستخدم البيانات المطلوبة لتشغيل جلسة الطلب على هذه الطاولة.</p>
        </div></div></section>
      </div>
    </main>
  );
}
