/* ==========================================================================
   ResetPassword.jsx — a new password from a reset link. Two kinds of link:
   - /reset-password?token=…            the e-mail from the auth service
   - /reset-password?token=…&email=…    the platform team's WhatsApp link (Laravel)
   The auth service sends ?error=INVALID_TOKEN when an e-mail link is used up or old.
   ========================================================================== */
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail } from "lucide-react";
import AuthLayout from "../../components/auth/AuthLayout";
import FormField from "../../components/auth/FormField";
import PasswordField from "../../components/auth/PasswordField";
import FormAlert from "../../components/auth/FormAlert";
import AuthSubmitButton from "../../components/auth/AuthSubmitButton";
import { resetPassword } from "../../api/auth";
import { t } from "../../i18n";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";
  const emailFromLink = searchParams.get("email") || "";
  const fromWhatsApp = Boolean(emailFromLink);
  const linkError = searchParams.get("error");

  const [email, setEmail] = useState(emailFromLink);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("كلمتا المرور غير متطابقتين."));
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)) {
      setError(t("8 أحرف على الأقل، مع حرف كبير وصغير ورقم ورمز."));
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ token, email: fromWhatsApp ? email : "", password, passwordConfirmation: confirmPassword });
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(err.message || t("تعذّر تحديث كلمة المرور. الرجاء طلب رابط جديد."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow={t("كلمة مرور جديدة")}
      title={t("خلّينا نجدّدها.")}
      subtitle={t("اختر كلمة مرور جديدة وقوية لحسابك.")}
    >
      <h1 className="mb-7 font-display text-3xl text-ink">{t("تعيين كلمة مرور جديدة")}</h1>

      {done ? (
        <FormAlert tone="success">{t("تم تحديث كلمة المرور وتسجيل خروجك من كل الأجهزة. جارِ تحويلك لصفحة تسجيل الدخول…")}</FormAlert>
      ) : (
        <>
          {(!token || linkError) && (
            <div className="mb-6">
              <FormAlert>{linkError ? t("رابط إعادة التعيين غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.") : t("رابط إعادة التعيين ناقص أو غير صالح. الرجاء طلب رابط جديد من صفحة استرجاع كلمة المرور.")}</FormAlert>
              <Link to="/forgot-password" className="mt-3 inline-block text-sm font-bold text-copper-ink hover:text-copper">{t("طلب رابط جديد")}</Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {fromWhatsApp && (
              <FormField
                id="email"
                label={t("البريد الإلكتروني")}
                icon={Mail}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            )}

            <PasswordField
              id="password"
              label={t("كلمة المرور الجديدة")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <PasswordField
              id="confirmPassword"
              label={t("تأكيد كلمة المرور")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <AuthSubmitButton loading={loading} disabled={!token || Boolean(linkError)}>
              {loading ? t("جارِ التحديث…") : t("تحديث كلمة المرور")}
            </AuthSubmitButton>

            {error && <FormAlert>{error}</FormAlert>}
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            <Link to="/login" className="font-medium text-ink transition-colors hover:text-copper">
              {t("الرجوع لتسجيل الدخول")}
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
