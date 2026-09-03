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

// أسماء الميزات بالعربي — القيم الخام بـ config (زي "theme-presets") مش
// معدّة للعرض المباشر للزبون.
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
    <section id="pricing" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-black tracking-[.2em] text-[#EEA122]">الأسعار</span>
        <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">باقة تناسب حجم مطعمك.</h2>
        <p className="mt-5 text-lg leading-8 text-[#F3EFE5]/55">
          ابدأ بالباقة المناسبة، وارتقِ في أي وقت مع نمو مطعمك — بلا عقود طويلة الأمد.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {PLAN_ORDER.map((id, i) => {
          const plan = SUBSCRIPTION_PLANS[id];
          const popular = id === "pro";

          return (
            <Reveal key={id} delay={i * 80}>
              <article
                className={`relative flex h-full flex-col rounded-3xl border p-7 transition duration-300 hover:-translate-y-1.5 ${
                  popular
                    ? "border-[#EEA122]/50 bg-[#EEA122]/[.06] shadow-2xl shadow-[#EEA122]/10 lg:-mt-4 lg:mb-4"
                    : "border-[#F3EFE5]/10 bg-[#F3EFE5]/[.025] hover:border-[#EEA122]/30 hover:bg-[#EEA122]/[.04]"
                }`}
              >
                {popular && (
                  <span className="absolute -top-3 right-7 rounded-full bg-[#EEA122] px-3 py-1 text-[11px] font-black text-[#1F2420]">
                    الأكثر اختيارًا
                  </span>
                )}

                <h3 className="text-xl font-black">{plan.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#F3EFE5]/55">{plan.description}</p>

                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-4xl font-black">${plan.price}</span>
                  <span className="text-sm text-[#F3EFE5]/45">/ شهريًا</span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 text-xs text-[#F3EFE5]/60">
                  <span className="rounded-full bg-[#F3EFE5]/[.06] px-3 py-1">
                    حتى {formatLimit(plan.limits.tables)} طاولة
                  </span>
                  <span className="rounded-full bg-[#F3EFE5]/[.06] px-3 py-1">
                    حتى {formatLimit(plan.limits.menuItems)} صنف
                  </span>
                </div>

                <ul className="mt-7 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm leading-6 text-[#F3EFE5]/75">
                      <Check size={16} className="mt-0.5 shrink-0 text-[#EEA122]" aria-hidden="true" />
                      {FEATURE_LABELS[feature] || feature}
                    </li>
                  ))}
                </ul>

                <a
                  href={`/register?plan=${id}`}
                  className={`mt-8 block rounded-full px-5 py-3.5 text-center text-sm font-black transition ${
                    popular
                      ? "bg-[#EEA122] text-[#1F2420] hover:bg-[#E67E22]"
                      : "border border-[#F3EFE5]/15 text-[#F3EFE5] hover:border-[#EEA122]/40 hover:bg-[#EEA122]/10"
                  }`}
                >
                  ابدأ بباقة {plan.name}
                </a>
              </article>
            </Reveal>
          );
        })}
      </div>

      <p className="mt-10 text-center text-xs text-[#F3EFE5]/35">
        كل الباقات تشمل: طلب عبر QR، متابعة حية للطلبات، ولوحات مخصّصة للمطبخ والكاشير والنادل.
      </p>
    </section>
  );
}
