/* ==========================================================================
   ScanEntry.jsx — أول شاشة يشوفها الزبون بعد مسح رمز QR الخاص بالطاولة
   يغطي: FR-24 (فتح جلسة بالاسم + رقم الهاتف)
   --------------------------------------------------------------------------
   المسار المتوقع: /t/:tableCode  (الرمز داخل QR، وليس معرّف الطاولة الداخلي)
   بعد فتح الجلسة بنجاح، ننتقل لصفحة القائمة مع sessionId بالـ URL.
   ========================================================================== */
import { useState } from "react";
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
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const session = await openSession({ tableCode, name, phone });
      navigate(`/t/${tableCode}/menu?session=${session.id}`);
    } catch (err) {
      // FR-26: الـ backend يرفض بـ 409 لو في جلسة نشطة أصلاً على نفس الطاولة.
      if (err.status === 409) {
        setError("هذه الطاولة لديها جلسة نشطة بالفعل. الرجاء طلب مساعدة الطاقم.");
      } else {
        setError(err.message || "تعذّر بدء جلستك. الرجاء المحاولة مرة أخرى.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-paper-2 p-7 text-ink shadow-xl">
        <span className="mb-1 block text-xs font-medium tracking-wide text-copper-deep">
          طاولة {tableCode}
        </span>
        <h1 className="mb-2 font-display text-3xl">أهلاً بك!</h1>
        <p className="mb-6 text-sm text-ink-soft">
          أدخل اسمك ورقم هاتفك لتبدأ الطلب.
        </p>

        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-brick/10 px-3 py-2 text-sm text-brick">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">الاسم</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-copper focus:ring-2 focus:ring-copper/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-soft">
              رقم الهاتف
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full rounded-lg border border-ink/15 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-copper focus:ring-2 focus:ring-copper/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-copper py-3 text-sm font-medium text-paper transition-colors hover:bg-copper-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "جارِ البدء…" : "ابدأ الطلب"}
          </button>
        </form>
      </div>
    </div>
  );
}
