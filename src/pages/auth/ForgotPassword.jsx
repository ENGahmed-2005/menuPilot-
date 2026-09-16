import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { forgotPassword } from "../../api/auth";
import AuthLayout from "../../components/auth/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("يرجى إدخال البريد الإلكتروني.");
      return;
    }
    setLoading(true);
    try {
      const data = await forgotPassword({ email: email.trim() });
      setSent(true);
      if (data?._devResetToken) {
        setResetLink(`/reset-password?token=${data._devResetToken}&email=${encodeURIComponent(email.trim())}`);
      }
    } catch (err) {
      setError(err.message || "تعذر إرسال طلب الاسترجاع.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout eyebrow="استرجاع الحساب" title="نساعدك ترجع لحسابك." subtitle="نسيت كلمة المرور؟ لا مشكلة. أرسل بريد حسابك وسنجهز لك رابط إعادة التعيين.">
      <div className="mb-8">
        <h1 className="font-arabic-display text-4xl leading-tight text-ink">استرجاع كلمة المرور</h1>
        <p className="mt-3 text-sm leading-6 text-ink-soft">سنرسل تعليمات إعادة التعيين إلى بريدك الإلكتروني.</p>
      </div>

      {sent ? (
        <div className="space-y-5">
          <div className="flex gap-3 rounded-2xl border border-herb/25 bg-herb/5 p-4 text-sm leading-6 text-ink">
            <CheckCircle2 className="mt-0.5 shrink-0 text-herb" size={19} />
            <span>إذا كان البريد <strong dir="ltr">{email}</strong> مسجلًا لدينا، فقد تم إنشاء طلب الاسترجاع.</span>
          </div>
          {resetLink && (
            <div className="rounded-2xl border border-copper/20 bg-copper/5 p-4 text-sm leading-6 text-ink-soft">
              <p className="font-bold text-ink">وضع الاختبار</p>
              <p className="mt-1">الـ Mock API لا يرسل بريدًا حقيقيًا. استخدم الرابط التالي لإكمال الاختبار.</p>
              <Link to={resetLink} className="mt-3 inline-flex items-center gap-2 font-bold text-copper-deep no-underline hover:text-copper">فتح صفحة إعادة التعيين <ArrowRight size={15} /></Link>
            </div>
          )}
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-copper-deep no-underline hover:text-copper">العودة إلى تسجيل الدخول <ArrowRight size={15} /></Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-bold text-ink">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft/50" size={18} />
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="w-full rounded-2xl border border-ink/15 bg-paper px-11 py-3.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/40 focus:border-copper focus:ring-4 focus:ring-copper/10" />
            </div>
          </div>
          {error && <div role="alert" className="rounded-2xl border border-brick/30 bg-brick/5 px-4 py-3 text-sm leading-6 text-brick">{error}</div>}
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-copper px-5 py-3.5 text-sm font-extrabold text-ink shadow-lg shadow-copper/15 transition hover:bg-copper-deep disabled:cursor-not-allowed disabled:opacity-60">{loading ? "جارٍ إرسال الطلب..." : "إرسال رابط الاسترجاع"}<ArrowRight size={17} /></button>
          <p className="text-center text-sm text-ink-soft">تذكرت كلمة المرور؟ <Link to="/login" className="font-extrabold text-copper-deep no-underline hover:text-copper">تسجيل الدخول</Link></p>
        </form>
      )}
    </AuthLayout>
  );
}
