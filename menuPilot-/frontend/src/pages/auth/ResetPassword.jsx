/* ==========================================================================
   ResetPassword.jsx — تعيين كلمة مرور جديدة عبر رابط البريد الإلكتروني.
   امتداد لـ FR-02. يُفتح على /reset-password?token=...&email=...
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

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";
  const emailFromLink = searchParams.get("email") || "";

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
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ token, email, password, passwordConfirmation: confirmPassword });
      setDone(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(err.message || "تعذّر تحديث كلمة المرور. الرجاء طلب رابط جديد.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="كلمة مرور جديدة"
      title="خلّينا نجدّدها."
      subtitle="اختر كلمة مرور جديدة وقوية لحسابك."
    >
      <h1 className="mb-7 font-display text-3xl text-ink">تعيين كلمة مرور جديدة</h1>

      {done ? (
        <FormAlert tone="success">تم تحديث كلمة المرور بنجاح. جارِ تحويلك لصفحة تسجيل الدخول…</FormAlert>
      ) : (
        <>
          {!token && (
            <div className="mb-6">
              <FormAlert>رابط إعادة التعيين ناقص أو غير صالح. الرجاء طلب رابط جديد من صفحة استرجاع كلمة المرور.</FormAlert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField
              id="email"
              label="البريد الإلكتروني"
              icon={Mail}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <PasswordField
              id="password"
              label="كلمة المرور الجديدة"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <PasswordField
              id="confirmPassword"
              label="تأكيد كلمة المرور"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <AuthSubmitButton loading={loading} disabled={!token}>
              {loading ? "جارِ التحديث…" : "تحديث كلمة المرور"}
            </AuthSubmitButton>

            {error && <FormAlert>{error}</FormAlert>}
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            <Link to="/login" className="font-medium text-ink transition-colors hover:text-copper">
              الرجوع لتسجيل الدخول
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
