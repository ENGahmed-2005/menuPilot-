/* ==========================================================================
   Hero.jsx — قسم البداية (العنوان الرئيسي + معاينة تفاعلية للوحة المطعم)
   ========================================================================== */
import { ArrowLeft, Check, QrCode, UtensilsCrossed } from "lucide-react";
import { lazy, Suspense } from "react";
import Reveal from "./Reveal";
import { shot } from "./shots";
import { t } from "../../../i18n";

// Three.js تقيلة (~500 كيلوبايت) ومطلوبة بس في صفحة الهبوط، فلو استوردناها
// بشكل عادي هتتحمّل في كل صفحة بالتطبيق (تسجيل الدخول، لوحة التحكم...).
// lazy() بيعمل chunk منفصل ليها، يتحمّل بس لما حد يفتح "/" فعليًا.
const ShapeMosaic = lazy(() => import("./backgrounds/ShapeMosaic"));

const PREVIEW_STATS = [
  ["24", t("طلب اليوم")],
  ["18", t("طاولة نشطة")],
  ["7", t("قيد التحضير")],
  [t("12 د"), t("متوسط التحضير")],
];

const PREVIEW_ORDERS = [
  [t("طاولة 04"), t("برجر + بطاطا"), t("قيد التحضير")],
  [t("طاولة 09"), t("لاتيه × 2"), t("تم الاستلام")],
  [t("طاولة 12"), t("بيتزا مارجريتا"), t("جاهز")],
];

export default function Hero({ onNavigate }) {
  return (
    <section className="relative isolate overflow-hidden">

      {/* خلفية Shape Mosaic التفاعلية (WebGL/Three.js) — أشكال بتلف وتضيء
          قرب الماوس. ألوان مربوطة بهوية الموقع: ink-soft للحالة العادية
          (خافتة جدًا فوق الخلفية الداكنة)، وcopper#EEA122 عند القرب من
          المؤشر (نفس لون زرار الـ CTA). z سالب زي دوائر الـ blur فوق —
          كده الأزرار والنص فوقها بالكامل (تُلمس عاديًا)، والمناطق الفاضية
          بس هي اللي بتستقبل حركة الماوس وتتفاعل. -z-10 بيخليها تحت المحتوى
          بس فوق خلفية <main> الداكنة، فبتبان كطبقة زخرفية خلف كل حاجة. */}
      <div className="pointer-events-auto absolute inset-0 -z-10">
        <Suspense fallback={null}>
          <ShapeMosaic
            ink="#2E4259" /* subtle lighter-green mosaic on forest */
            lit="#EEA122"
            cell={34}
            size={8}
            kinds={6}
            fill={0}
            spin={8}
            turn={16}
            reach={17}
            style={{ opacity: 0.4 }} /* quieter, so the real screenshots lead */
          />
        </Suspense>
      </div>

      {/* pointer-events-none هنا هو الإصلاح: من غيرها، الـ div ده (اللي بياخد
          مساحة القسم كله حتى في الفراغات بين النص والبطاقة) كان بيبلع كل
          أحداث الماوس قبل ما توصل لطبقة الـ mosaic تحته، فالتفاعل مع
          المؤشر كان شغّال بس في هوامش الشاشة النادرة برّه الـ max-w-7xl.
          كل عنصر قابل للنقر فعليًا (الزرارين) بيفعّل pointer-events-auto
          بنفسه صراحة عشان يفضل شغّال عادي. */}
      <div className="pointer-events-none mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:pb-32">
        <Reveal>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            {t("مطعمك يتحرك أسرع،")}
            <span className="block">{t("والطلب يصبح أبسط.")}</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#F3EFE5]/65 sm:text-xl">
            {t("menuPilot يجمع المنيو الرقمي، الطلب عبر QR، المطبخ، الطاولات، الفواتير والتقارير في منصة واحدة مصممة لتقليل الفوضى ورفع كفاءة التشغيل.")}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate("/register")}
              className="group pointer-events-auto inline-flex items-center gap-2 rounded-full bg-[#EEA122] px-7 py-4 font-black text-[#172331] shadow-lg shadow-[#EEA122]/20 transition hover:-translate-y-0.5 hover:bg-[#E67E22] hover:shadow-xl hover:shadow-[#EEA122]/25"
            >
              {t("ابدأ مع menuPilot")}
              <ArrowLeft size={18} className="transition group-hover:-translate-x-1" />
            </button>
            <a href="#features" className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#F3EFE5]/15 px-7 py-4 font-bold text-[#F3EFE5]/85 transition hover:border-[#F3EFE5]/35 hover:bg-[#F3EFE5]/5">
              {t("اكتشف كيف يعمل")}
              <ArrowLeft size={18} />
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#F3EFE5]/70">
            <span className="flex items-center gap-2"><Check size={16} className="text-[#4B6A8A]" /> {t("طلبات QR")}</span>
            <span className="flex items-center gap-2"><Check size={16} className="text-[#4B6A8A]" /> {t("إدارة المطبخ")}</span>
            <span className="flex items-center gap-2"><Check size={16} className="text-[#4B6A8A]" /> {t("فواتير ومدفوعات")}</span>
            <span className="flex items-center gap-2"><Check size={16} className="text-[#4B6A8A]" /> {t("تجربة مجانية 14 يومًا")}</span>
          </div>
        </Reveal>

        {/* The product itself: the owner dashboard and the guest menu, captured from the app. */}
        <Reveal delay={150} className="relative mx-auto w-full max-w-xl pb-10 lg:max-w-none">
          <div className="absolute -inset-6 rounded-[2rem] bg-[#EEA122]/10 blur-3xl" aria-hidden="true" />
          <div className="hero-level relative overflow-hidden rounded-2xl border border-[#F3EFE5]/10 bg-[#0d1620] shadow-2xl">
            <div className="flex h-7 items-center gap-1.5 border-b border-white/10 bg-[#0a1118] px-3" aria-hidden="true">
              <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <img src={shot("dashboard")} alt={t("لوحة المالك في menuPilot: مبيعات اليوم والطلبات والطاولات")} width="1600" height="1000" fetchPriority="high" className="block w-full" />
          </div>
          <img src={shot("menu")} alt={t("منيو الزبون على الجوال بعد مسح رمز الطاولة")} width="560" height="1212"
            className="hero-phone absolute -bottom-2 end-[-0.5rem] w-[30%] max-w-[180px] rounded-[1.5rem] border-[6px] border-[#05090d] shadow-2xl sm:end-[-1.5rem]" />
        </Reveal>
      </div>
    </section>
  );
}
