/* ==========================================================================
   Welcome.jsx — shown once right after registration (route /welcome).
   No payment form: the 14-day free trial is already running. Dates and
   remaining days come from the server.
   ========================================================================== */
import { Link } from "react-router-dom";
import { CalendarCheck2, CalendarClock, Hourglass } from "lucide-react";
import BrandLogo from "../../components/brand/Logo";
import { useSubscription } from "../../hooks/useSubscription";
import { buttonClasses } from "../../components/ui/Button";

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString("ar-PS-u-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—");

export default function Welcome() {
  const { subscription: s, remainingDays, trialDays } = useSubscription();
  return (
    <main dir="rtl" className="grid min-h-screen place-items-center bg-paper-2 px-5 py-10 text-ink">
      <div className="w-full max-w-lg rounded-[var(--radius-panel)] bg-surface p-8 text-center shadow-[var(--shadow-raised)] ring-1 ring-line">
        <BrandLogo height={34} className="mx-auto" />
        <h1 className="mt-8 text-3xl font-extrabold">تم إنشاء حسابك بنجاح 🎉</h1>
        <p className="mt-2 text-base font-bold text-ink-soft">مرحبًا بك في menuPilot</p>
        <p className="mt-1 text-sm text-muted">بدأت تجربتك المجانية لمدة {trialDays} يومًا.</p>

        <dl className="mt-7 divide-y divide-line rounded-2xl border border-line text-sm text-start">
          <div className="flex items-center justify-between gap-3 px-4 py-3"><dt className="flex items-center gap-2 text-muted"><CalendarCheck2 size={16} aria-hidden="true" /> بداية التجربة</dt><dd className="font-bold">{fmt(s?.trial_started_at)}</dd></div>
          <div className="flex items-center justify-between gap-3 px-4 py-3"><dt className="flex items-center gap-2 text-muted"><CalendarClock size={16} aria-hidden="true" /> نهاية التجربة</dt><dd className="font-bold">{fmt(s?.trial_ends_at)}</dd></div>
          <div className="flex items-center justify-between gap-3 px-4 py-3"><dt className="flex items-center gap-2 text-muted"><Hourglass size={16} aria-hidden="true" /> الأيام المتبقية</dt><dd className="num text-lg font-extrabold text-herb">{remainingDays}</dd></div>
        </dl>

        <p className="mt-5 text-xs leading-6 text-muted">كل الميزات مفتوحة خلال التجربة، ولا نطلب منك أي بيانات دفع الآن.</p>
        <Link to="/owner/dashboard" className={`${buttonClasses({ size: "lg", block: true })} mt-6`}>الانتقال إلى لوحة التحكم</Link>
      </div>
    </main>
  );
}
