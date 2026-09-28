/* ==========================================================================
   TrialBanner — countdown / grace / expired notice on every dashboard page.
   Numbers come from the server (remaining_days, trial_days, phase).
   Calm wording: data is safe; some operational features pause after expiry.
   ========================================================================== */
import { Link } from "react-router-dom";
import { AlertTriangle, Clock3, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { buttonClasses } from "../ui/Button";

const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString("ar-PS-u-nu-latn", { day: "numeric", month: "long", year: "numeric" }) : "—");
const daysText = (n) => (n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n <= 10 ? `${n} أيام` : `${n} يومًا`);

export default function TrialBanner() {
  const { role, user } = useAuth();
  const { subscription: s, phase, remainingDays, trialDays } = useSubscription();
  if (!s || role === "admin" || phase === "active") return null;
  const owner = role === "owner";
  const planPath = `/owner/subscription/${s.requested_plan || "basic"}`;

  if (phase === "expired" || phase === "cancelled") {
    return (
      <section role="status" className="mb-6 rounded-[var(--radius-card)] border border-copper/30 bg-copper/[0.08] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={22} className="mt-0.5 shrink-0 text-copper-ink" aria-hidden="true" />
            <div>
              <p className="text-lg font-extrabold text-ink">{phase === "cancelled" ? "الاشتراك متوقف" : "انتهت الفترة التجريبية"}</p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                {phase === "cancelled" ? "أُوقف اشتراك المطعم." : `انتهت تجربتك المجانية لمدة ${trialDays} يومًا.`} بيانات مطعمك محفوظة، لكن بعض الميزات التشغيلية متوقفة
                (الطلبات الجديدة، والطاولات، والمنيو، وإضافة الموظفين).
              </p>
              {s.requested_plan && <p className="mt-1 text-sm font-bold text-herb">طلبت خطة «{s.requested_plan}»، وستُفعَّل فور تأكيد الدفع.</p>}
              {!owner && <p className="mt-1 text-sm font-bold text-ink">تواصل مع صاحب المطعم لتجديد الاشتراك.</p>}
            </div>
          </div>
          {owner && (
            <div className="flex flex-wrap gap-2">
              <Link to={planPath} className={buttonClasses({ size: "sm" })}>اختيار خطة</Link>
              <Link to={`/owner/subscription/${user?.plan === "trial" ? "basic" : user?.plan}`} className={buttonClasses({ size: "sm", variant: "secondary" })}>إدارة الاشتراك</Link>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (phase === "grace") {
    return (
      <section role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-brick/30 bg-brick/[0.07] p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-brick"><AlertTriangle size={18} aria-hidden="true" />
          انتهت تجربتك المجانية. المطعم يعمل مؤقتًا حتى {fmt(s.grace_ends_at)}، ثم تتوقف الميزات التشغيلية حتى تختار خطة.</p>
        {owner && <Link to={planPath} className={buttonClasses({ size: "sm", variant: "danger" })}>اختيار خطة الآن</Link>}
      </section>
    );
  }

  // Trial running: countdown + progress.
  if (!owner) return null;
  const used = Math.min(100, Math.max(0, ((trialDays - remainingDays) / trialDays) * 100));
  const urgent = phase === "urgent" || phase === "last_day";
  return (
    <section className={`mb-6 rounded-[var(--radius-card)] border p-4 ${urgent ? "border-copper/40 bg-copper/[0.08]" : "border-line bg-surface"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-ink">
          {urgent ? <Clock3 size={18} className="text-copper-ink" aria-hidden="true" /> : <ShieldCheck size={18} className="text-herb" aria-hidden="true" />}
          {phase === "last_day" ? "اليوم هو آخر يوم في تجربتك المجانية" : `متبقي ${daysText(remainingDays)} على انتهاء تجربتك المجانية`}
          <span className="font-medium text-muted">· تنتهي {fmt(s.trial_ends_at)}</span>
        </p>
        <Link to={planPath} className={buttonClasses({ size: "sm", variant: urgent ? "primary" : "secondary" })}>اختيار خطة</Link>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/[0.07]" role="progressbar" aria-valuemin={0} aria-valuemax={trialDays} aria-valuenow={trialDays - remainingDays} aria-label="تقدّم الفترة التجريبية">
        <div className={`h-full rounded-full ${urgent ? "bg-copper" : "bg-herb"}`} style={{ width: `${used}%` }} />
      </div>
    </section>
  );
}
