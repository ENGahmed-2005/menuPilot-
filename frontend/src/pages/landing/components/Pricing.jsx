/* ==========================================================================
   Pricing.jsx — قسم "الباقات" بصفحة الهبوط
   --------------------------------------------------------------------------
   البيانات (السعر/الميزات/الحدود) مسحوبة من config/subscriptions.js —
   نفس المصدر المستخدم بلوحة تحكم صاحب المطعم (SubscriptionPlanPage) —
   عشان أي تعديل مستقبلي على الأسعار أو الميزات ينعكس هون تلقائيًا بدل
   ما نضطر نحدّث نصوص هالقسم يدويًا كل مرة.
   ========================================================================== */
import { Check } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "../../../config/subscriptions";
import Reveal from "./Reveal";

const PLAN_ORDER = ["basic", "pro", "premium"];

const FEATURE_LABELS = {
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

export default function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-[11px] font-black tracking-[.18em] text-[#EEA122] uppercase">الأسعار</span>
        <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">باقة تناسب حجم مطعمك.</h2>
        <p className="mt-4 text-base leading-7 text-[#F3EFE5]/55">
          ابدأ بالباقة المناسبة، وارتقِ في أي وقت مع نمو مطعمك.
        </p>

        {/* 14-day trial badge */}
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#5B7A52]/40 bg-[#5B7A52]/10 px-4 py-2 text-sm font-bold text-[#5B7A52]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5B7A52]" />
          تجربة مجانية لمدة 14 يومًا — بدون بطاقة ائتمانية
        </div>
      </Reveal>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {PLAN_ORDER.map((id, i) => {
          const plan = SUBSCRIPTION_PLANS[id];
          const popular = id === "pro";

          return (
            <Reveal key={id} delay={i * 80}>
              <article
                className={`relative flex h-full flex-col rounded-2xl border p-5 transition duration-300 hover:-translate-y-1 ${
                  popular
                    ? "border-[#EEA122]/40 bg-[#EEA122]/[.07] shadow-xl shadow-[#EEA122]/10 lg:-mt-3 lg:mb-3"
                    : "border-[#F3EFE5]/10 bg-[#F3EFE5]/[.02] hover:border-[#EEA122]/25 hover:bg-[#EEA122]/[.04]"
                }`}
              >
                {popular && (
                  <span className="absolute -top-3 right-5 rounded-full bg-[#EEA122] px-3 py-0.5 text-[10px] font-black text-[#1F2420]">
                    الأكثر اختيارًا
                  </span>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black">{plan.name}</h3>
                    <p className="mt-1 text-xs leading-5 text-[#F3EFE5]/50">{plan.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-2xl font-black">${plan.price}</span>
                    <span className="block text-[11px] text-[#F3EFE5]/40">/ شهريًا</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-[#F3EFE5]/55">
                  <span className="rounded-full bg-[#F3EFE5]/[.06] px-2.5 py-0.5">
                    حتى {formatLimit(plan.limits.tables)} طاولة
                  </span>
                  <span className="rounded-full bg-[#F3EFE5]/[.06] px-2.5 py-0.5">
                    حتى {formatLimit(plan.limits.menuItems)} صنف
                  </span>
                </div>

                <ul className="mt-5 flex-1 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs leading-5 text-[#F3EFE5]/70">
                      <Check size={13} className="mt-0.5 shrink-0 text-[#EEA122]" aria-hidden="true" />
                      {FEATURE_LABELS[feature] || feature}
                    </li>
                  ))}
                </ul>

                <a
                  href={`/register?plan=${id}`}
                  className={`mt-6 block rounded-full px-4 py-2.5 text-center text-xs font-black transition ${
                    popular
                      ? "bg-[#EEA122] text-[#1F2420] hover:bg-[#E67E22]"
                      : "border border-[#F3EFE5]/15 text-[#F3EFE5] hover:border-[#EEA122]/35 hover:bg-[#EEA122]/10"
                  }`}
                >
                  ابدأ تجربتك المجانية
                </a>
              </article>
            </Reveal>
          );
        })}
      </div>

      <p className="mt-8 text-center text-[11px] text-[#F3EFE5]/30">
        جميع الباقات تشمل: طلب عبر QR، متابعة حية للطلبات، ولوحات مخصّصة للمطبخ والكاشير والنادل. لا عقود، إلغاء في أي وقت.
      </p>
    </section>
  );
}
