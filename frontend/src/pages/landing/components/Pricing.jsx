/* ==========================================================================
   Pricing.jsx — قسم "الباقات" بصفحة الهبوط
   --------------------------------------------------------------------------
   البيانات (السعر/الميزات/الحدود) مسحوبة من config/subscriptions.js —
   نفس المصدر المستخدم بلوحة تحكم صاحب المطعم (SubscriptionPlanPage) —
   عشان أي تعديل مستقبلي على الأسعار أو الميزات ينعكس هون تلقائيًا بدل
   ما نضطر نحدّث نصوص هالقسم يدويًا كل مرة.
   ========================================================================== */
import { useState } from "react";
import { Bike, Check, ChevronDown, ChevronUp, Palette } from "lucide-react";
import { ADDON_ORDER, MAIN_PLANS, SUBSCRIPTION_ADDONS, SUBSCRIPTION_PLANS } from "../../../config/subscriptions";
import Reveal from "./Reveal";
import { AR, countAr } from "../../../utils/plural";
import { t } from "../../../i18n";

const COLLAPSED_COUNT = 4;

const ADDON_ICONS = { delivery: Bike, brand_plus: Palette };

const FEATURE_LABELS = {
  "everything-basic": t("كل ما في الأساسية"),
  online_orders: t("طلب أونلاين: استلام وتوصيل بلا عمولة"),
  dashboard: t("لوحة تحكم موحّدة"),
  tables: t("إدارة الطاولات"),
  menu: t("إدارة القائمة"),
  orders: t("إدارة الطلبات"),
  kitchen: t("لوحة المطبخ"),
  cashier: t("الكاشير والفواتير"),
  waiter: t("لوحة النادل"),
  staff: t("الفريق والصلاحيات"),
  reports: t("تقارير المبيعات"),
  "order-history": t("سجل الطلبات"),
  "smart-alerts": t("تنبيهات ذكية"),
  branding: t("شعار وهوية خاصة للمنيو"),
  background: t("خلفية مخصصة للمنيو"),
  "full-colors": t("ألوان المنيو بالكامل"),
  presets: t("قوالب جاهزة لتصميم المنيو"),
  "theme-presets": t("ثيمات جاهزة للوحة التحكم"),
};

// Pro lists only what it adds on top of Basic.
function featuresFor(id) {
  if (id === "basic") return SUBSCRIPTION_PLANS.basic.features;
  return ["everything-basic", ...SUBSCRIPTION_PLANS[id].features.filter((f) => !SUBSCRIPTION_PLANS.basic.features.includes(f))];
}


function limitText(value, unit, plural) {
  return value === Infinity ? t("{0} بلا حدود", { 0: plural }) : t("حتى {0} {1}", { 0: value, 1: unit });
}

// Annual billing: pay 10 months, get 12 (server applies the same rule).
const ANNUAL_PAID_MONTHS = 10;

function PlanCard({ id, plan, popular, delay, annual }) {
  const [expanded, setExpanded] = useState(false);
  const features = featuresFor(id);
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
            {t("الأكثر اختيارًا")}
          </span>
        )}

        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-black">{plan.name}</h3>
            <p className="mt-1 text-xs leading-5 text-[#F3EFE5]/70">{plan.description}</p>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-2xl font-black">${annual ? plan.price * ANNUAL_PAID_MONTHS : plan.price}</span>
            <span className="block text-[11px] text-[#F3EFE5]/70">{annual ? t("/ سنويًا") : t("/ شهريًا")}</span>
            {annual && <span className="mt-1 block text-[11px] font-bold text-[#EEA122]">≈ ${(plan.price * ANNUAL_PAID_MONTHS / 12).toFixed(1)} {t("شهريًا")}</span>}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-[#F3EFE5]/70">
          <span className="rounded-full bg-[#F3EFE5]/[.06] px-2.5 py-0.5">
            {limitText(plan.limits.tables, t("طاولة"), t("طاولات"))}
          </span>
          <span className="rounded-full bg-[#F3EFE5]/[.06] px-2.5 py-0.5">
            {limitText(plan.limits.menuItems, t("صنف"), t("أصناف"))}
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
              <><ChevronUp size={13} /> {t("عرض أقل")}</>
            ) : (
              <><ChevronDown size={13} /> {t("عرض")} {countAr(features.length - COLLAPSED_COUNT, AR.extraFeatures)}</>
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
          {t("ابدأ تجربتك المجانية")}
        </a>
      </article>
    </Reveal>
  );
}

// A restaurant without tables subscribes to online ordering on its own.
function DeliveryOnly({ annual }) {
  const plan = SUBSCRIPTION_PLANS.delivery_only;
  const includes = [t("المنيو الرقمي"), t("طلبات الاستلام والتوصيل من رابط مطعمك"), t("مناطق ورسوم توصيل وإدارة السائقين"), t("شاشة المطبخ والفريق")];
  return (
    <Reveal delay={120} className="mx-auto mt-6 max-w-4xl">
      <article className="flex flex-col gap-5 rounded-2xl border border-[#EEA122]/25 bg-[#F3EFE5]/[.03] p-5 md:flex-row md:items-center">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#EEA122]/15 text-[#EEA122]"><Bike size={22} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-black">{t("ما عندك صالة؟ اشترك في")} {plan.name}</h3>
          <p className="mt-1 text-xs leading-5 text-[#F3EFE5]/70">{plan.description}</p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {includes.map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-xs text-[#F3EFE5]/70"><Check size={13} className="shrink-0 text-[#EEA122]" aria-hidden="true" />{item}</li>
            ))}
          </ul>
        </div>
        <div className="flex shrink-0 items-center gap-4 md:flex-col md:items-end md:gap-2">
          <p className="text-right"><span className="text-2xl font-black">${annual ? plan.price * ANNUAL_PAID_MONTHS : plan.price}</span><span className="text-[11px] text-[#F3EFE5]/70">{annual ? t(" / سنويًا") : t(" / شهريًا")}</span></p>
          <a href="/register?plan=delivery_only" className="rounded-full border border-[#EEA122]/40 px-4 py-2 text-xs font-black text-[#F3EFE5] transition hover:bg-[#EEA122]/10">{t("ابدأ تجربتك المجانية")}</a>
        </div>
      </article>
    </Reveal>
  );
}

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-black tracking-[.12em] text-[#EEA122]">{t("الأسعار")}</span>
        <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">{t("باقة تناسب حجم مطعمك.")}</h2>
        <p className="mt-4 text-base leading-7 text-[#F3EFE5]/70">
          {t("ابدأ بالباقة المناسبة، وارتقِ في أي وقت مع نمو مطعمك.")}
        </p>

        {/* 14-day trial badge */}
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#EEA122]/30 bg-[#EEA122]/10 px-4 py-2 text-sm font-bold text-[#F3EFE5]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#EEA122]" />
          {t("تجربة مجانية لمدة 14 يومًا — بدون بطاقة ائتمانية")}
        </div>

        {/* Monthly / annual */}
        <div role="group" aria-label={t("مدة الاشتراك")} className="mx-auto mt-6 flex w-fit items-center gap-1 rounded-full border border-[#F3EFE5]/15 bg-[#F3EFE5]/[.04] p-1 text-sm font-bold">
          <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)} className={`rounded-full px-5 py-2 transition ${!annual ? "bg-[#EEA122] text-[#172331]" : "text-[#F3EFE5]/80 hover:text-[#F3EFE5]"}`}>{t("شهري")}</button>
          <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)} className={`flex items-center gap-2 rounded-full px-5 py-2 transition ${annual ? "bg-[#EEA122] text-[#172331]" : "text-[#F3EFE5]/80 hover:text-[#F3EFE5]"}`}>
            {t("سنوي")} <span className={`rounded-full px-2 py-0.5 text-[10px] ${annual ? "bg-[#172331] text-[#EEA122]" : "bg-[#EEA122]/20 text-[#EEA122]"}`}>{t("شهران مجانًا")}</span>
          </button>
        </div>
      </Reveal>

      <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
        {MAIN_PLANS.map((id, i) => (
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

      <DeliveryOnly annual={annual} />

      <Reveal delay={160} className="mx-auto mt-10 max-w-4xl">
        <h3 className="text-center text-lg font-black">{t("أضف ما يحتاجه مطعمك فقط")}</h3>
        <p className="mt-2 text-center text-sm leading-6 text-[#F3EFE5]/70">{t("إضافات شهرية تُضاف إلى أي خطة تناسبها، وتلغيها متى شئت.")}</p>
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {ADDON_ORDER.map((addonId) => {
            const addon = SUBSCRIPTION_ADDONS[addonId];
            const Icon = ADDON_ICONS[addonId];
            const anyPlan = MAIN_PLANS.every((p) => addon.plans.includes(p));
            return (
              <li key={addonId} className="flex gap-3 rounded-2xl border border-[#F3EFE5]/10 bg-[#F3EFE5]/[.02] p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEA122]/15 text-[#EEA122]"><Icon size={18} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-sm font-black">{addon.name}</h4>
                    <span className="text-sm font-black">+${annual ? addon.price * ANNUAL_PAID_MONTHS : addon.price}<span className="text-[11px] font-medium text-[#F3EFE5]/70">{annual ? t(" / سنويًا") : t(" / شهريًا")}</span></span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#F3EFE5]/70">{addon.description}</p>
                  <p className="mt-2 text-[11px] font-bold text-[#EEA122]/90">{anyPlan ? t("مع أي خطة") : t("مع {0} فقط", { 0: addon.plans.map((p) => SUBSCRIPTION_PLANS[p].name).join(" أو ") })}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Reveal>

      <p className="mt-8 text-center text-xs leading-6 text-[#F3EFE5]/70">
        {t("الأساسية والاحترافية تشملان: طلب عبر QR من الطاولة، ومتابعة حية للطلبات، ولوحات للمطبخ والكاشير والنادل. بلا عمولة على الطلبات، وبلا عقود، وإلغاء في أي وقت.")}
      </p>
    </section>
  );
}
