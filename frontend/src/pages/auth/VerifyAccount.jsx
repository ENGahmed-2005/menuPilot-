import { useEffect, useState } from "react";
import { CheckCircle2, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getVerificationStatus, sendVerification, verifyCode } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { getRoleHome } from "../../utils/roleHome";

export default function VerifyAccount() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const email = params.get("email") || "";
  const [status, setStatus] = useState({ email: false });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadStatus() {
    if (!email) return;
    try {
      const data = await getVerificationStatus(email);
      setStatus(data.verification || {});
    } catch (e) { setError(e.message || "تعذر تحميل حالة التحقق."); }
  }

  useEffect(() => { loadStatus(); }, [email]);

  async function sendCode() {
    setBusy(true); setError(""); setMessage("");
    try {
      await sendVerification(email);
      setMessage("تم إرسال رمز OTP إلى بريدك الإلكتروني.");
    } catch (e) { setError(e.message || "تعذر إرسال الرمز."); }
    finally { setBusy(false); }
  }

  async function checkCode(e) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { setError("أدخل رمزًا من 6 أرقام."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await verifyCode(email, code);
      setStatus(data.verification || { email: true });
      setCode("");
      setMessage("تم التحقق بنجاح.");
      if (data.token && data.user) {
        updateUser(data.user);
        navigate(getRoleHome(data.user.role), { replace: true });
      }
    } catch (e) { setError(e.message || "رمز التحقق غير صحيح."); }
    finally { setBusy(false); }
  }

  if (!email) return <main className="grid min-h-screen place-items-center bg-[#F3EFE5] p-5"><div className="max-w-md rounded-3xl bg-white p-8 text-center"><h1 className="text-2xl font-black">رابط التحقق غير مكتمل</h1><button onClick={() => navigate("/register")} className="mt-5 rounded-full bg-[#EEA122] px-5 py-3 font-bold">العودة للتسجيل</button></div></main>;

  return <main dir="rtl" className="grid min-h-screen place-items-center bg-[#F3EFE5] p-5 text-[#1F2420]">
    <section className="w-full max-w-lg rounded-[30px] border border-[#4B5147]/10 bg-white p-6 shadow-[0_24px_70px_rgba(31,36,32,.08)] sm:p-9">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#EEA122]/10 text-[#E67E22]"><ShieldCheck size={30}/></div>
      <h1 className="mt-5 text-center font-[Aref_Ruqaa] text-4xl">تحقق من بريدك الإلكتروني</h1>
      <p className="mt-3 text-center text-sm leading-7 text-[#4B5147]/65">أرسلنا رمز تحقق من 6 أرقام إلى البريد الإلكتروني التالي.</p>
      <p className="mt-3 text-center text-xs font-bold" dir="ltr">{email}</p>

      <div className="mt-7 flex items-center gap-3 rounded-2xl border border-[#4B5147]/10 bg-[#F3EFE5]/40 p-4">
        <Mail size={20} className="text-[#E67E22]" />
        <div><p className="text-sm font-bold">البريد الإلكتروني</p><p className="text-xs text-[#4B5147]/55">{status.email ? "تم التحقق ✓" : "بانتظار التحقق"}</p></div>
      </div>

      {error && <div className="mt-5 rounded-2xl border border-[#B33F32]/20 bg-[#B33F32]/5 p-3 text-sm font-semibold text-[#B33F32]">{error}</div>}
      {message && <div className="mt-5 rounded-2xl border border-[#5B7A52]/20 bg-[#5B7A52]/5 p-3 text-sm font-semibold text-[#5B7A52]">{message}</div>}

      {!status.email && <button onClick={sendCode} disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#1F2420] px-5 py-4 text-sm font-black text-white disabled:opacity-50"><RefreshCw size={17} className={busy ? "animate-spin" : ""}/>إرسال رمز OTP</button>}
      {!status.email && <form onSubmit={checkCode} className="mt-4 flex gap-3"><input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0,6))} inputMode="numeric" maxLength={6} placeholder="123456" className="min-w-0 flex-1 rounded-full border border-[#4B5147]/15 bg-[#F3EFE5]/40 px-5 py-3.5 text-center text-lg font-black tracking-[.35em] outline-none focus:border-[#EEA122]" /><button disabled={busy} className="rounded-full bg-[#EEA122] px-5 py-3.5 font-black disabled:opacity-50">تحقق</button></form>}
      {status.email && <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[#5B7A52]/10 p-4 text-sm font-bold text-[#5B7A52]"><CheckCircle2 size={20}/>تم تأكيد البريد الإلكتروني. جارٍ تسجيل دخولك…</div>}
    </section>
  </main>;
}
