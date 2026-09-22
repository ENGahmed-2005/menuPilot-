import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const inputClass = "w-full rounded-2xl border border-[#4B5147]/20 bg-white px-4 py-3.5 text-sm text-[#1F2420] outline-none transition placeholder:text-[#4B5147]/45 focus:border-[#EEA122] focus:ring-4 focus:ring-[#EEA122]/10";
const Logo = ({ className = "h-10" }) => <span className="brand-logo-surface inline-flex shrink-0 items-center"><img src="/menuPilot-logo.svg" alt="menuPilot" className={`brand-logo ${className} w-auto`} /></span>;

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!email.trim()) return setError("أدخل بريدك الإلكتروني.");
    setLoading(true);
    try { await login({ email: email.trim(), returnTo: "/owner/dashboard" }); }
    catch (e) { setError(e?.message || "تعذر بدء تسجيل الدخول."); setLoading(false); }
  }

  return <main dir="rtl" className="min-h-screen bg-[#F3EFE5] font-[Cairo] text-[#1F2420]">
    <div className="grid min-h-screen lg:grid-cols-[.82fr_1.18fr]">
      <aside className="relative hidden overflow-hidden bg-[#1F2420] p-10 text-[#F3EFE5] lg:flex lg:flex-col lg:justify-between xl:p-14">
        <Link to="/" className="relative z-10 flex w-fit items-center no-underline" dir="ltr"><Logo /></Link>
        <div className="relative z-10 max-w-md">
          <span className="mb-5 inline-flex rounded-full border border-[#EEA122]/30 bg-[#EEA122]/10 px-3 py-1 text-xs font-bold text-[#EEA122]">أهلاً بعودتك</span>
          <h1 className="font-[Aref_Ruqaa] text-5xl leading-tight xl:text-6xl">كل ما يحتاجه مطعمك، في مكان واحد.</h1>
          <p className="mt-6 text-sm leading-8 text-[#F3EFE5]/65">سيتم تحويلك إلى Logto لإكمال تسجيل الدخول والتحقق من البريد.</p>
          <div className="mt-8 space-y-3 text-sm text-[#F3EFE5]/80">{["إدارة الطلبات لحظيًا","قائمة رقمية عبر QR","لوحات تحكم للأدوار المختلفة"].map((item)=><div key={item} className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5B7A52]/20 text-[#EEA122]"><Check size={14}/></span>{item}</div>)}</div>
        </div>
        <p className="relative z-10 text-xs text-[#F3EFE5]/35">نظام إدارة مطاعم حديث · menuPilot</p>
      </aside>
      <section className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-8 sm:py-10">
        <div className="w-full max-w-md">
          <div className="mb-7 flex items-center justify-between"><Link to="/" className="lg:hidden" dir="ltr"><Logo className="h-9"/></Link><Link to="/register" className="text-sm font-bold text-[#4B5147]">ليس لديك حساب؟ إنشاء حساب</Link></div>
          <div className="rounded-[28px] border border-[#4B5147]/10 bg-white p-5 shadow-[0_24px_70px_rgba(31,36,32,.08)] sm:p-8 md:p-10">
            <div className="mb-8 text-center"><span className="inline-flex rounded-full bg-[#EEA122]/10 px-3 py-1 text-xs font-bold text-[#E67E22]">تسجيل الدخول</span><h1 className="mt-4 font-[Aref_Ruqaa] text-4xl leading-tight sm:text-5xl">أهلاً بعودتك</h1><p className="mx-auto mt-3 text-sm leading-7 text-[#4B5147]/65">أدخل بريدك ثم أكمل المصادقة في Logto.</p></div>
            {error && <div role="alert" className="mb-6 rounded-2xl border border-[#B33F32]/20 bg-[#B33F32]/5 px-4 py-3 text-sm font-semibold text-[#B33F32]">{error}</div>}
            <form onSubmit={submit} className="grid gap-5">
              <div><label htmlFor="email" className="mb-2 block text-sm font-bold">البريد الإلكتروني</label><div className="relative"><Mail size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#4B5147]/35"/><input id="email" type="email" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" className={`${inputClass} pr-11`}/></div></div>
              <button type="submit" disabled={loading} className="mt-2 w-full rounded-full bg-[#EEA122] px-5 py-4 text-sm font-black text-[#1F2420] disabled:opacity-60">{loading ? "جارٍ التحويل..." : "المتابعة إلى تسجيل الدخول"}</button>
            </form>
          </div>
        </div>
      </section>
    </div>
  </main>;
}