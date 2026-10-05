import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { forgotPassword } from "../../api/auth";
import AuthLayout from "../../components/auth/AuthLayout";
import { t } from "../../i18n";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError(t("يرجى إدخال البريد الإلكتروني."));
      return;
    }
    setLoading(true);
    try {
      // The reset link arrives by e-mail only (locally: see storage/logs/laravel.log).
      await forgotPassword({ email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(err.message || t("تعذر إرسال طلب الاسترجاع."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout eyebrow={t("استرجاع الحساب")} title={t("نساعدك ترجع لحسابك.")} subtitle={t("نسيت كلمة المرور؟ أرسل بريد حسابك، وسيرسل لك فريق menuPilot رابط إعادة التعيين على واتساب.")}>
      <div className="mb-8">
        <h1 className="font-arabic-display text-4xl leading-tight text-ink">{t("استرجاع كلمة المرور")}</h1>
        <p className="mt-3 text-sm leading-6 text-ink-soft">{t("سيصلك رابط إعادة التعيين على رقم واتساب المسجّل للمطعم. إذا كنت موظفًا، اطلب من صاحب المطعم تغيير كلمة مرورك.")}</p>
      </div>

      {sent ? (
        <div className="space-y-5">
          <div className="flex gap-3 rounded-2xl border border-herb/25 bg-herb/5 p-4 text-sm leading-6 text-ink">
            <CheckCircle2 className="mt-0.5 shrink-0 text-herb" size={19} />
            <span>{t("إذا كان البريد")} <strong dir="ltr">{email}</strong> {t("مسجلًا لدينا، فقد وصل طلبك إلى فريق menuPilot، وسيرسل لك الرابط على واتساب قريبًا.")}</span>
          </div>
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-copper-ink no-underline hover:text-copper">{t("العودة إلى تسجيل الدخول")} <ArrowRight size={15} /></Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-bold text-ink">{t("البريد الإلكتروني")}</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="w-full rounded-2xl border border-ink/15 bg-paper px-11 py-3.5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-copper focus:ring-4 focus:ring-copper/10" />
            </div>
          </div>
          {error && <div role="alert" className="rounded-2xl border border-brick/30 bg-brick/5 px-4 py-3 text-sm leading-6 text-brick">{error}</div>}
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-copper px-5 py-3.5 text-sm font-extrabold text-ink shadow-lg shadow-copper/15 transition hover:bg-copper-deep disabled:cursor-not-allowed disabled:opacity-60">{loading ? t("جارٍ إرسال الطلب...") : t("إرسال رابط الاسترجاع")}<ArrowRight size={17} /></button>
          <p className="text-center text-sm text-ink-soft">{t("تذكرت كلمة المرور؟")} <Link to="/login" className="font-extrabold text-copper-ink no-underline hover:text-copper">{t("تسجيل الدخول")}</Link></p>
        </form>
      )}
    </AuthLayout>
  );
}
