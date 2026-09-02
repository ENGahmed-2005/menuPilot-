/* ==========================================================================
   Hero.jsx — قسم البداية (العنوان الرئيسي + معاينة تفاعلية للوحة المطعم)
   ========================================================================== */
import { ArrowLeft, Check, QrCode, Sparkles, UtensilsCrossed } from "lucide-react";
import { lazy, Suspense } from "react";
import Reveal from "./Reveal";

// Three.js تقيلة (~500 كيلوبايت) ومطلوبة بس في صفحة الهبوط، فلو استوردناها
// بشكل عادي هتتحمّل في كل صفحة بالتطبيق (تسجيل الدخول، لوحة التحكم...).
// lazy() بيعمل chunk منفصل ليها، يتحمّل بس لما حد يفتح "/" فعليًا.
const ShapeMosaic = lazy(() => import("./backgrounds/ShapeMosaic"));

const PREVIEW_STATS = [
  ["24", "طلب اليوم"],
  ["18", "طاولة نشطة"],
  ["7", "قيد التحضير"],
  ["96%", "رضا العملاء"],
];

const PREVIEW_ORDERS = [
  ["طاولة 04", "برجر + بطاطا", "قيد التحضير"],
  ["طاولة 09", "لاتيه × 2", "تم الاستلام"],
  ["طاولة 12", "بيتزا مارجريتا", "جاهز"],
];

export default function Hero({ onNavigate }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute -right-40 top-0 -z-10 h-96 w-96 animate-[pulse_9s_ease-in-out_infinite] rounded-full bg-[#EEA122]/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 bottom-0 -z-10 h-96 w-96 animate-[pulse_11s_ease-in-out_infinite] rounded-full bg-[#5B7A52]/10 blur-3xl" />

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
            ink="#4B5147"
            lit="#EEA122"
            cell={34}
            size={8}
            kinds={6}
            fill={0}
            spin={8}
            turn={16}
            reach={17}
            style={{ opacity: 0.75 }}
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
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#EEA122]/25 bg-[#EEA122]/10 px-4 py-2 text-xs font-bold text-[#EEA122]">
            <Sparkles size={14} className="animate-pulse" />
            نظام إدارة مطاعم حديث
          </div>
          <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            مطعمك يتحرك أسرع،
            <span className="block bg-gradient-to-l from-[#EEA122] to-[#E67E22] bg-clip-text text-transparent">
              والطلب يصبح أبسط.
            </span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#F3EFE5]/65 sm:text-xl">
            menuPilot يجمع المنيو الرقمي، الطلب عبر QR، المطبخ، الطاولات، الفواتير والتقارير في منصة واحدة مصممة لتقليل الفوضى ورفع كفاءة التشغيل.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate("/register")}
              className="group pointer-events-auto inline-flex items-center gap-2 rounded-full bg-[#EEA122] px-7 py-4 font-black text-[#1F2420] shadow-lg shadow-[#EEA122]/20 transition hover:-translate-y-0.5 hover:bg-[#E67E22] hover:shadow-xl hover:shadow-[#EEA122]/25"
            >
              ابدأ مع menuPilot
              <ArrowLeft size={18} className="transition group-hover:-translate-x-1" />
            </button>
            <a href="#how" className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#F3EFE5]/15 px-7 py-4 font-bold text-[#F3EFE5]/85 transition hover:border-[#F3EFE5]/35 hover:bg-[#F3EFE5]/5">
              اكتشف كيف يعمل
              <ArrowLeft size={18} />
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#F3EFE5]/50">
            <span className="flex items-center gap-2"><Check size={16} className="text-[#5B7A52]" /> طلبات QR</span>
            <span className="flex items-center gap-2"><Check size={16} className="text-[#5B7A52]" /> إدارة المطبخ</span>
            <span className="flex items-center gap-2"><Check size={16} className="text-[#5B7A52]" /> فواتير ومدفوعات</span>
          </div>
        </Reveal>

        <Reveal delay={150} className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-5 rounded-[2rem] bg-[#EEA122]/10 blur-2xl" />
          <div className="relative animate-[float_6s_ease-in-out_infinite] overflow-hidden rounded-[2rem] border border-[#F3EFE5]/10 bg-[#F3EFE5] p-5 text-[#1F2420] shadow-2xl sm:p-7">
            <div className="flex items-center justify-between border-b border-[#1F2420]/10 pb-5">
              <div>
                <p className="text-xs font-bold text-[#4B5147]">لوحة المطعم</p>
                <h2 className="mt-1 text-2xl font-black">EVAN Restaurant</h2>
              </div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#EEA122]"><QrCode size={25} /></span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PREVIEW_STATS.map(([value, label]) => (
                <div key={label} className="rounded-2xl bg-[#1F2420] p-4 text-[#F3EFE5] transition hover:bg-[#2A3129]">
                  <div className="text-2xl font-black text-[#EEA122]">{value}</div>
                  <div className="mt-1 text-[11px] text-[#F3EFE5]/55">{label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-[#1F2420]/10 bg-white/70 p-4">
              <div className="mb-3 flex items-center justify-between text-xs font-bold">
                <span>الطلبات الحالية</span>
                <span className="flex items-center gap-1.5 text-[#5B7A52]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5B7A52]" />
                  مباشر
                </span>
              </div>
              {PREVIEW_ORDERS.map(([table, order, status], index) => (
                <div key={table} className="flex items-center gap-3 border-t border-[#1F2420]/8 py-3 first:border-0 first:pt-0 last:pb-0">
                  <span className={`grid h-9 w-9 place-items-center rounded-xl ${index === 0 ? "bg-[#EEA122]/15 text-[#E67E22]" : "bg-[#5B7A52]/10 text-[#5B7A52]"}`}>
                    <UtensilsCrossed size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black">{table}</p>
                    <p className="truncate text-[11px] text-[#4B5147]">{order}</p>
                  </div>
                  <span className="text-[10px] font-bold text-[#4B5147]">{status}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
