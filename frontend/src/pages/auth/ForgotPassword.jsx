import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";
import { useLogto } from "@logto/react";
import AuthLayout from "../../components/auth/AuthLayout";

export default function ForgotPassword(){
  const { signIn }=useLogto();
  const [email,setEmail]=useState(""); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  async function submit(e){e.preventDefault();setError("");if(!email.trim())return setError("يرجى إدخال البريد الإلكتروني.");setLoading(true);try{await signIn({redirectUri:`${window.location.origin}/callback`,firstScreen:"reset_password",loginHint:email.trim(),identifier:["email"]});}catch(err){setError(err?.message||"تعذر فتح استرجاع كلمة المرور.");setLoading(false);}}
  return <AuthLayout eyebrow="استرجاع الحساب" title="نساعدك ترجع لحسابك." subtitle="سيتم تنفيذ إعادة تعيين كلمة المرور داخل Logto.">
    <div className="mb-8"><h1 className="font-arabic-display text-4xl leading-tight text-ink">استرجاع كلمة المرور</h1><p className="mt-3 text-sm leading-6 text-ink-soft">أدخل بريدك ثم أكمل خطوات الاسترجاع الآمنة في Logto.</p></div>
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div><label htmlFor="email" className="mb-2 block text-sm font-bold text-ink">البريد الإلكتروني</label><div className="relative"><Mail className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft/50" size={18}/><input id="email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" className="w-full rounded-2xl border border-ink/15 bg-paper px-11 py-3.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/40 focus:border-copper focus:ring-4 focus:ring-copper/10"/></div></div>
      {error&&<div role="alert" className="rounded-2xl border border-brick/30 bg-brick/5 px-4 py-3 text-sm leading-6 text-brick">{error}</div>}
      <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-copper px-5 py-3.5 text-sm font-extrabold text-ink shadow-lg shadow-copper/15 disabled:opacity-60">{loading?"جارٍ التحويل...":"متابعة الاسترجاع"}<ArrowRight size={17}/></button>
      <p className="text-center text-sm text-ink-soft">تذكرت كلمة المرور؟ <Link to="/login" className="font-extrabold text-copper-deep no-underline">تسجيل الدخول</Link></p>
    </form>
  </AuthLayout>;
}