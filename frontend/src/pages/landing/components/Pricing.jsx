/* ==========================================================================
   Pricing.jsx — قسم "الباقات" بصفحة الهبوط
   --------------------------------------------------------------------------
   البيانات (السعر/الميزات/الحدود) مسحوبة من config/subscriptions.js —
   نفس المصدر المستخدم بلوحة تحكم صاحب المطعم (SubscriptionPlanPage) —
   عشان أي تعديل مستقبلي على الأسعار أو الميزات ينعكس هون تلقائيًا بدل
   ما نضطر نحدّث نصوص هالقسم يدويًا كل مرة.
   ========================================================================== */
import { useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "../../../config/subscriptions";
import Reveal from "./Reveal";

const COLLAPSED_COUNT = 4;

const PLAN_ORDER = ["basic", "pro", "premium"];

const FEATURE_LABELS = {
  online_orders: "طلب أونلاين: استلام وتوصيل بلا عمولة",
  dashboard: "لوحة تحكم موحّدة",
  tables: "إدارة الطاولات",
  menu: "إدارة القائمة",
  orders: "إدارة الطلبات",
  kitchen: "لوحة المطبخ",
  cashier: "الكاشير والفواتير",
  waiter: "لوحة النادل",
  reports: "تقارير المبيعات",
  "advanced-reports": "تقارير متقدمة",
  analytics: "تحليلات أداء",
  "priority-support": "دعم فني بأولوية",
  "theme-presets": "ثيمات جاهزة للتخصيص",
  "custom-theme": "تخصيص لوني كامل",
};

function formatLimit(value) {
  return value === Infinity ? "بلا حدود" : value;
}

// Annual billing: pay 10 months, get 12 (server applies the same rule).
const ANNUAL_PAID_MONTHS = 10;

function PlanCard({ id, plan, popular, delay, annual }) {
  const [expanded, setExpanded] = useState(false);
  const features = plan.features;
  const hidden = features.length > COLLAPSED_COUNT;
  const visible = expanded ? features : features.slice(0, COLLAPSED_COUNT);

  return (
    <Reveal delay={delay}>
      <article
        className={`relative flex h-full flex-col rounded-2xl border p-5 transition duration-300 hover:-translate-y-1 ${
          popular
            ? "border-[#EEA122]/40 bg-[#EEA122]/[.07] shadow-xl shadow-[#EEA122]/10 lg:-mt-3 lg:mb-3"
            : "border-[#F3EFE5]/10 bg-[#F3EFE5]/[.02] hover:border-[#EEA122]/25 hover:bg-[#EEA122]/[.04]"
        }`}
      >
        {popular && (
          <span className="absolute -top-3 right-5 rounded-full bg-[#EEA122] px-3 py-0.5 text-[10px] font-black text-[#172331]">
            الأكثر اختيارًا
          </span>
        )}

        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-black">{plan.name}</h3>
            <p className="mt-1 text-xs leading-5 text-[#F3EFE5]/70">{plan.description}</p>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-2xl font-black">${annual ? plan.price * ANNUAL_PAID_MONTHS : plan.price}</span>
            <span className="block text-[11px] text-[#F3EFE5]/70">{annual ? "/ سنويًا" : "/ شهريًا"}</span>
            {annual && <span className="mt-1 block text-[11px] font-bold text-[#EEA122]">≈ ${(plan.price * ANNUAL_PAID_MONTHS / 12).toFixed(1)} شهريًا</span>}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-[#F3EFE5]/70">
          <span className="rounded-full bg-[#F3EFE5]/[.06] px-2.5 py-0.5">
            حتى {formatLimit(plan.limits.tables)} طاولة
          </span>
          <span className="rounded-full bg-[#F3EFE5]/[.06] px-2.5 py-0.5">
            حتى {formatLimit(plan.limits.menuItems)} صنف
          </span>
        </div>

        <ul className="mt-5 space-y-2">
          {visible.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-xs leading-5 text-[#F3EFE5]/70">
              <Check size={13} className="mt-0.5 shrink-0 text-[#EEA122]" aria-hidden="true" />
              {FEATURE_LABELS[feature] || feature}
            </li>
          ))}
        </ul>

        {hidden && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[#EEA122]/80 hover:text-[#EEA122] transition"
          >
            {expanded ? (
              <><ChevronUp size={13} /> عرض أقل</>
            ) : (
              <><ChevronDown size={13} /> عرض {features.length - COLLAPSED_COUNT} ميزة إضافية</>
            )}
          </button>
        )}

        <div className="flex-1" />

        <a
          href={`/register?plan=${id}`}
          className={`mt-6 block rounded-full px-4 py-2.5 text-center text-xs font-black transition ${
            popular
              ? "bg-[#EEA122] text-[#172331] hover:bg-[#E67E22]"
              : "border border-[#F3EFE5]/15 text-[#F3EFE5] hover:border-[#EEA122]/35 hover:bg-[#EEA122]/10"
          }`}
        >
          ابدأ تجربتك المجانية
        </a>
      </article>
    </Reveal>
  );
}

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-[11px] font-black tracking-[.18em] text-[#EEA122] uppercase">الأسعار</span>
        <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">باقة تناسب حجم مطعمك.</h2>
        <p className="mt-4 text-base leading-7 text-[#F3EFE5]/70">
          ابدأ بالباقة المناسبة، وارتقِ في أي وقت مع نمو مطعمك.
        </p>

        {/* 14-day trial badge */}
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#EEA122]/30 bg-[#EEA122]/10 px-4 py-2 text-sm font-bold text-[#F3EFE5]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#EEA122]" />
          تجربة مجانية لمدة 14 يومًا — بدون بطاقة ائتمانية
        </div>

        {/* Monthly / annual */}
        <div role="group" aria-label="مدة الاشتراك" className="mx-auto mt-6 flex w-fit items-center gap-1 rounded-full border border-[#F3EFE5]/15 bg-[#F3EFE5]/[.04] p-1 text-sm font-bold">
          <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)} className={`rounded-full px-5 py-2 transition ${!annual ? "bg-[#EEA122] text-[#172331]" : "text-[#F3EFE5]/80 hover:text-[#F3EFE5]"}`}>شهري</button>
          <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)} className={`flex items-center gap-2 rounded-full px-5 py-2 transition ${annual ? "bg-[#EEA122] text-[#172331]" : "text-[#F3EFE5]/80 hover:text-[#F3EFE5]"}`}>
            سنوي <span className={`rounded-full px-2 py-0.5 text-[10px] ${annual ? "bg-[#172331] text-[#EEA122]" : "bg-[#EEA122]/20 text-[#EEA122]"}`}>شهران مجانًا</span>
          </button>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {PLAN_ORDER.map((id, i) => (
          <PlanCard
            key={id}
            id={id}
            plan={SUBSCRIPTION_PLANS[id]}
            popular={id === "pro"}
            annual={annual}
            delay={i * 80}
          />
        ))}
      </div>

      <p className="mt-8 text-center text-xs leading-6 text-[#F3EFE5]/70">
        جميع الباقات تشمل: طلب عبر QR، ومتابعة حية للطلبات، ولوحات للمطبخ والكاشير والنادل. الباقة المميزة تضيف الطلب أونلاين. بلا عمولة على الطلبات، وبلا عقود، وإلغاء في أي وقت.
      </p>
    </section>
  );
}
