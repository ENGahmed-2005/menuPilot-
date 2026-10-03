/* ==========================================================================
   ProductTour.jsx — all of menuPilot in one compact section: pick a part,
   see its real screen. The screenshots are captured from the running app
   in the visitor's language (public/landing/{ar|en}-*.webp). It moves on by
   itself until the visitor picks a part or points at it; never for reduced
   motion.
   ========================================================================== */
import { useEffect, useState } from "react";
import { BarChart3, Bike, CalendarCheck, Check, ChefHat, Inbox, Palette, QrCode, Radio, Receipt, Wallet } from "lucide-react";
import Reveal from "./Reveal";
import { t } from "../../../i18n";
import { shot } from "./shots";
const STEP_MS = 6500;

const FEATURES = [
  { id: "qr", icon: QrCode, phone: true, img: "menu", title: t("منيو QR والطلب من الطاولة"),
    text: t("يمسح الزبون رمز طاولته فيفتح المنيو فورًا، ويطلب دون انتظار نادل ودون تحميل أي تطبيق."),
    points: [t("بطاقات مدمجة تناسب الجوال"), t("الاسم والجوال فقط عند إرسال الطلب"), t("تحقق من الموقع يمنع الطلبات الوهمية")] },
  { id: "tracking", icon: Radio, phone: true, img: "tracking", title: t("تتبع الطلب لحظة بلحظة"),
    text: t("يرى الزبون حالة طلبه تتحدث وحدها، ويستدعي النادل أو يطلب الفاتورة من جواله."),
    points: [t("مستلم، قيد التحضير، جاهز، تم التقديم"), t("طلبات إضافية لنفس الطاولة"), t("فاتورة مشتركة لكل من على الطاولة")] },
  { id: "kitchen", icon: ChefHat, img: "kitchen", title: t("شاشة المطبخ"),
    text: t("كل طلب يصل المطبخ فورًا في عمود حالته، بخط كبير يُقرأ من بعيد."),
    points: [t("وضع شاشة الحائط بملء الشاشة"), t("الطلبات المتأخرة تتقدم وتتلوّن"), t("ملاحظات الزبون بارزة على التذكرة")] },
  { id: "cashier", icon: Receipt, img: "cashier", title: t("الطاولات والفواتير"),
    text: t("الكاشير يرى كل طاولة ومبلغها، ويؤكد الدفع ويغلق الجلسة من شاشة واحدة."),
    points: [t("الطاولات التي تطلب الفاتورة أولًا"), t("نقدًا أو تحويلًا أو محفظة"), t("كل تعديل سعر في سجل التدقيق")] },
  { id: "online", icon: Bike, phone: true, img: "online", title: t("الطلب أونلاين بلا عمولة"),
    text: t("رابط ورمز QR خاص بمطعمك لطلبات الاستلام والتوصيل، دون منصات وسيطة."),
    points: [t("مناطق ورسوم توصيل وحد أدنى"), t("تأكيد الطلب والفاتورة على واتساب"), t("اشتراك «التوصيل فقط» لمطعم بلا صالة")] },
  { id: "outside", icon: Inbox, img: "outside", title: t("استقبال طلبات التوصيل"),
    text: t("تصل طلبات الاستلام والتوصيل بتنبيه صوتي، فتقبلها بوقت تحضير أو ترفضها بسبب."),
    points: [t("تأكيد التحويل قبل التحضير"), t("توزيع الطلبات على السائقين"), t("موقع الزبون على الخريطة")] },
  { id: "dashboard", icon: BarChart3, img: "dashboard", title: t("لوحة المالك"),
    text: t("مبيعات اليوم وما يحتاج انتباهك وحالة الطاولات، في نظرة واحدة."),
    points: [t("تنبيهات توصلك لمكان المشكلة"), t("تقارير المبيعات والأكثر طلبًا"), t("فريق بصلاحيات لكل دور")] },
  { id: "finance", icon: Wallet, img: "finance", title: t("الأرباح والمصاريف"),
    text: t("ربحك الحقيقي كل شهر: الإيراد ناقص الرواتب والمصاريف."),
    points: [t("مقارنة آخر 6 أشهر"), t("مصاريف شهرية متكررة كالإيجار"), t("المصاريف حسب الفئة")] },
  { id: "payroll", icon: CalendarCheck, img: "attendance", title: t("الرواتب والحضور"),
    text: t("رواتب شهرية أو أسبوعية أو يومية، تُحسب من حضور الموظفين وغيابهم."),
    points: [t("تسجيل يوم كامل بضغطتين"), t("الغياب يُخصم والإجازة لا"), t("كشف رواتب لكل شهر")] },
  { id: "branding", icon: Palette, img: "branding", title: t("هوية المنيو"),
    text: t("منيو يشبه مطعمك: الألوان والشعار وطريقة عرض الأطباق، بمعاينة حية."),
    points: [t("أربعة تخطيطات للأطباق"), t("ثلاثة أشكال لرأس المنيو"), t("بالعربية والإنجليزية")] },
];

function Screen({ feature }) {
  return (
    // Phone shots get a taller box on small screens, so the screen stays readable.
    <div className={`relative overflow-hidden rounded-2xl border border-[#F3EFE5]/10 bg-[#0d1620] shadow-2xl ${feature.phone ? "aspect-[4/5] sm:aspect-[16/10]" : "aspect-[16/10]"}`}>
      {feature.phone ? (
        // A flex box with a definite height (inset-0), so the phone fits its full height on any width.
        <div className="absolute inset-0 flex items-center justify-center py-[3%] bg-[radial-gradient(60%_80%_at_50%_30%,rgba(238,161,34,0.14),transparent_70%)]">
          <img key={feature.img} src={shot(feature.img)} alt={feature.title} width="560" height="1212" decoding="async"
            className="tour-in block h-full w-auto max-w-[80%] rounded-[1.6rem] border-[6px] border-[#05090d] object-contain shadow-2xl" />
        </div>
      ) : (
        <>
          <div className="flex h-7 items-center gap-1.5 border-b border-white/10 bg-[#0a1118] px-3" aria-hidden="true">
            <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <img key={feature.img} src={shot(feature.img)} alt={feature.title} width="1600" height="1000" decoding="async" className="tour-in block w-full" />
        </>
      )}
    </div>
  );
}

export default function ProductTour() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [paused, setPaused] = useState(false);
  // No auto-advance for reduced motion, nor on small screens, where the box's height changes between parts.
  const [reduce] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce), (max-width: 1023px)").matches));
  useEffect(() => {
    if (!auto || paused || reduce) return undefined;
    const id = setTimeout(() => setActive((a) => (a + 1) % FEATURES.length), STEP_MS);
    return () => clearTimeout(id);
  }, [active, auto, paused, reduce]);
  const pick = (i) => { setActive(i); setAuto(false); };
  // Other sections (Roles) can ask to show a part: menupilot:tour with its id.
  useEffect(() => {
    const show = (e) => {
      const i = FEATURES.findIndex((x) => x.id === e.detail);
      if (i < 0) return;
      setActive(i); setAuto(false);
      document.getElementById("features")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    };
    window.addEventListener("menupilot:tour", show);
    return () => window.removeEventListener("menupilot:tour", show);
  }, [reduce]);
  const f = FEATURES[active];

  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8 lg:px-10 lg:py-24"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
      <Reveal className="max-w-2xl">
        <h2 className="text-3xl font-black leading-tight sm:text-4xl">{t("كل ما يحتاجه مطعمك، في نظام واحد.")}</h2>
        <p className="mt-3 text-base leading-7 text-[#F3EFE5]/70">{t("اختر جزءًا لترى شاشته الحقيقية من النظام، من طاولة الزبون إلى أرباح الشهر.")}</p>
      </Reveal>
      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-start lg:gap-10">
        <div role="tablist" aria-label={t("أجزاء menuPilot")} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
          {FEATURES.map((x, i) => {
            const on = i === active;
            const Icon = x.icon;
            return (
              <button key={x.id} type="button" role="tab" id={`tour-${x.id}`} aria-selected={on} aria-controls="tour-panel" onClick={() => pick(i)}
                className={`relative min-h-11 shrink-0 overflow-hidden rounded-xl border px-4 py-2.5 text-start transition-colors lg:w-full ${on ? "border-[#EEA122]/45 bg-[#F3EFE5]/[.07]" : "border-[#F3EFE5]/10 lg:border-transparent hover:bg-[#F3EFE5]/[.04]"}`}>
                <span className="flex items-center gap-3">
                  <Icon size={18} aria-hidden="true" className={on ? "text-[#EEA122]" : "text-[#F3EFE5]/55"} />
                  <b className={`whitespace-nowrap text-sm lg:whitespace-normal ${on ? "text-[#F3EFE5]" : "text-[#F3EFE5]/75"}`}>{x.title}</b>
                </span>
                {on && <span className="mt-1.5 hidden text-sm leading-6 text-[#F3EFE5]/70 lg:block">{x.text}</span>}
                {on && auto && !reduce && (
                  <span key={active} aria-hidden="true" className="tour-progress absolute inset-x-0 bottom-0 h-0.5 bg-[#EEA122]" style={{ animationDuration: `${STEP_MS}ms`, animationPlayState: paused ? "paused" : "running" }} />
                )}
              </button>
            );
          })}
        </div>
        <div id="tour-panel" role="tabpanel" aria-labelledby={`tour-${f.id}`}>
          <Screen feature={f} />
          <p className="mt-5 text-base leading-7 text-[#F3EFE5]/80 lg:hidden">{f.text}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {f.points.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm leading-6 text-[#F3EFE5]/80"><Check size={16} className="mt-1 shrink-0 text-[#EEA122]" aria-hidden="true" />{p}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
