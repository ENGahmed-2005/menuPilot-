import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Store } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const inputClass = "w-full rounded-2xl border border-[#4B5147]/20 bg-white px-4 py-3.5 text-sm text-[#1F2420] outline-none transition placeholder:text-[#4B5147]/45 focus:border-[#EEA122] focus:ring-4 focus:ring-[#EEA122]/10";

export default function Register() {
  const { register } = useAuth();
  const [restaurantName,setRestaurantName]=useState("");
  const [restaurantType,setRestaurantType]=useState("");
  const [email,setEmail]=useState("");
  const [plan,setPlan]=useState("trial");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  async function submit(event){
    event.preventDefault(); setError("");
    if(!restaurantName.trim()||!restaurantType||!email.trim()) return setError("أكمل اسم المطعم ونوعه والبريد الإلكتروني.");
    setLoading(true);
    try{ await register({restaurantName:restaurantName.trim(),restaurantType,email:email.trim(),plan}); }
    catch(e){setError(e?.message||"تعذر بدء التسجيل.");setLoading(false);}
  }

  return <main dir="rtl" className="min-h-screen bg-[#F3EFE5] font-[Cairo] text-[#1F2420]">
    <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-[.85fr_1.15fr]">
      <aside className="relative hidden overflow-hidden bg-[#1F2420] p-12 text-[#F3EFE5] lg:flex lg:flex-col lg:justify-between">
        <div><div className="text-xl font-black" dir="ltr">menuPilot</div><span className="mt-8 inline-flex rounded-full border border-[#EEA122]/30 bg-[#EEA122]/10 px-3 py-1 text-xs font-bold text-[#EEA122]">ابدأ الآن</span><h1 className="mt-5 font-[Aref_Ruqaa] text-5xl leading-tight">جهّز مطعمك، ثم دع Logto يتولى المصادقة.</h1><p className="mt-6 text-sm leading-8 text-[#F3EFE5]/65">بيانات المطعم تبقى في menuPilot، بينما الحساب وكلمة المرور والتحقق والجلسة يديرها Logto.</p></div>
        <div className="space-y-3 text-sm text-[#F3EFE5]/80">{["تحقق البريد عبر Logto","جلسات OAuth/OIDC","Laravel يحمي بيانات المطعم"].map(item=><div key={item} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#5B7A52]/20 text-[#EEA122]"><Check size={14}/></span>{item}</div>)}</div>
      </aside>
      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-xl">
          <div className="mb-7 flex justify-end"><Link to="/login" className="text-sm font-bold text-[#4B5147]">لديك حساب؟ تسجيل الدخول</Link></div>
          <div className="rounded-[30px] border border-[#4B5147]/10 bg-white p-6 shadow-[0_24px_70px_rgba(31,36,32,.08)] sm:p-10">
            <div className="mb-8"><span className="inline-flex rounded-full bg-[#EEA122]/10 px-3 py-1 text-xs font-bold text-[#E67E22]">إنشاء حساب</span><h1 className="mt-4 font-[Aref_Ruqaa] text-4xl sm:text-5xl">لنجهز مطعمك أولًا</h1><p className="mt-3 text-sm leading-7 text-[#4B5147]/65">بعد هذه الخطوة سينقلك menuPilot إلى Logto لإكمال إنشاء الحساب والتحقق من البريد.</p></div>
            {error&&<div role="alert" className="mb-6 rounded-2xl border border-[#B33F32]/20 bg-[#B33F32]/5 px-4 py-3 text-sm font-semibold text-[#B33F32]">{error}</div>}
            <form onSubmit={submit} className="grid gap-5">
              <div><label className="mb-2 block text-sm font-bold">اسم المطعم</label><div className="relative"><Store size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#4B5147]/35"/><input value={restaurantName} onChange={e=>setRestaurantName(e.target.value)} className={`${inputClass} pr-11`} placeholder="مثال: مطعم النبضة"/></div></div>
              <div><label className="mb-2 block text-sm font-bold">نوع المطعم</label><select value={restaurantType} onChange={e=>setRestaurantType(e.target.value)} className={inputClass}><option value="">اختر النوع</option><option value="restaurant">مطعم</option><option value="cafe">مقهى</option><option value="fast_food">وجبات سريعة</option><option value="bakery">مخبز</option><option value="other">أخرى</option></select></div>
              <div><label className="mb-2 block text-sm font-bold">البريد الإلكتروني</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className={inputClass} placeholder="you@example.com"/></div>
              <div><label className="mb-2 block text-sm font-bold">الخطة</label><select value={plan} onChange={e=>setPlan(e.target.value)} className={inputClass}><option value="trial">تجربة مجانية</option><option value="basic">Basic</option><option value="pro">Pro</option><option value="premium">Premium</option></select></div>
              <button disabled={loading} className="mt-2 w-full rounded-full bg-[#EEA122] px-5 py-4 text-sm font-black text-[#1F2420] disabled:opacity-60">{loading?"جارٍ التحويل إلى Logto...":"المتابعة إلى إنشاء الحساب"}</button>
            </form>
          </div>
        </div>
      </section>
    </div>
  </main>;
}