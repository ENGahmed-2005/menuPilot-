/* WhyUs.jsx — why menuPilot, in the three things no alternative does together
   (the same three the pitch deck compares on), each with a small live
   illustration, then four numbers that count up as they come into view. */
import { useEffect, useRef, useState } from "react";
import { BadgePercent, CloudOff, QrCode, RefreshCw } from "lucide-react";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import { prefersReducedMotion, useInView } from "./useInView";
import { t } from "../../../i18n";

const STATS = [
  [5, t("أدوار في نظام واحد")],
  [10, t("أجزاء من المنيو إلى الرواتب")],
  [2, t("العربية والإنجليزية، بالكامل")],
  [14, t("يومًا تجربة مجانية")],
];

// An order chip runs from the table to the kitchen.
function TableToKitchen() {
  return (
    <div className="flex w-full items-center gap-3 text-xs font-bold">
      <span className="shrink-0 rounded-full bg-[#F3EFE5]/10 px-3 py-1.5 text-[#F3EFE5]">{t("طاولة 4")}</span>
      <span className="relative h-px flex-1 bg-[#F3EFE5]/15">
        <i className="run-dot absolute -top-1 h-2 w-2 rounded-full bg-[#EEA122] shadow-[0_0_12px_#EEA122]" />
      </span>
      <span className="shrink-0 rounded-full bg-[#EEA122]/15 px-3 py-1.5 text-[#EEA122]">{t("المطبخ")}</span>
    </div>
  );
}

// The connection drops, changes wait on the device, then sync by themselves.
function OfflinePill() {
  return (
    <div className="cycle-3 grid justify-start text-xs font-bold">
      <span className="inline-flex items-center gap-2 rounded-full bg-[#1C714B]/20 px-3 py-1.5 text-[#7fd1a6]"><i className="h-1.5 w-1.5 rounded-full bg-current" />{t("متصل")}</span>
      <span className="inline-flex items-center gap-2 rounded-full bg-[#EEA122]/15 px-3 py-1.5 text-[#EEA122]"><CloudOff size={13} aria-hidden="true" />{t("بدون إنترنت · 2 بانتظار المزامنة")}</span>
      <span className="inline-flex items-center gap-2 rounded-full bg-[#1C714B]/20 px-3 py-1.5 text-[#7fd1a6]"><RefreshCw size={13} aria-hidden="true" />{t("رجع الاتصال · تمت المزامنة")}</span>
    </div>
  );
}

function NoCommission() {
  return (
    <div className="flex items-baseline gap-2">
      <b className="text-3xl font-black leading-none text-[#EEA122]" dir="ltr">0%</b>
      <span className="text-xs font-bold text-[#F3EFE5]/70">{t("عمولة على أي طلب")}</span>
    </div>
  );
}

const POINTS = [
  { icon: QrCode, Visual: TableToKitchen, title: t("من الطاولة إلى المطبخ مباشرة"),
    text: t("الزبون يطلب من جواله، والطلب يظهر فورًا على شاشة المطبخ. لا ورق، ولا انتظار نادل.") },
  { icon: CloudOff, Visual: OfflinePill, title: t("يكمل حتى لو انقطع الإنترنت"),
    text: t("المطبخ والكاشير يكملان عملهما، وكل تغيير يُرسل وحده عند عودة الاتصال، دون أن يُحسب مرتين.") },
  { icon: BadgePercent, Visual: NoCommission, title: t("سعر ثابت، بلا عمولة"),
    text: t("اشتراك شهري واضح يبدأ من 15 دولارًا، بلا عقود، وبلا عمولة حتى على طلبات التوصيل.") },
];

function Counter({ to, start }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!start) return undefined;
    if (prefersReducedMotion()) { setN(to); return undefined; }
    let frame;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / 1200);
      setN(Math.round(to * (1 - (1 - p) ** 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, start]);
  // Screen readers get the final number, not the count.
  return <><span aria-hidden="true" className="num">{n}</span><span className="sr-only">{to}</span></>;
}

export default function WhyUs() {
  const statsRef = useRef(null);
  const statsSeen = useInView(statsRef, { threshold: 0.5 });

  return (
    <section id="why" className="scroll-mt-24 border-y border-[#F3EFE5]/8 bg-[#F3EFE5]/[.02]">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <SectionHeading eyebrow={t("لماذا menuPilot")} title={t("ثلاثة أشياء لا تجتمع إلا هنا.")}>
          {t("هناك بدائل كثيرة: الورقة والنادل، ومنيو QR للعرض فقط، وأنظمة الكاشير، وتطبيقات التوصيل. menuPilot وحده يجمع الثلاثة.")}
        </SectionHeading>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {POINTS.map(({ icon: Icon, Visual, title, text }, i) => (
            <Reveal key={title} delay={i * 90}
              className="group flex flex-col rounded-2xl border border-[#F3EFE5]/10 bg-[#F3EFE5]/[.03] p-5 transition-colors duration-300 hover:border-[#EEA122]/40 hover:bg-[#F3EFE5]/[.05] sm:p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#EEA122]/15 text-[#EEA122] transition-transform duration-300 group-hover:-translate-y-0.5">
                <Icon size={21} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-black">{title}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-7 text-[#F3EFE5]/70">{text}</p>
              <div aria-hidden="true" className="mt-5 flex min-h-12 items-center rounded-xl border border-[#F3EFE5]/8 bg-[#0d1620]/60 px-4 py-3">
                <Visual />
              </div>
            </Reveal>
          ))}
        </div>

        <dl ref={statsRef} className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#F3EFE5]/10 bg-[#F3EFE5]/10 lg:grid-cols-4">
          {STATS.map(([value, label]) => (
            <div key={label} className="flex flex-col gap-1 bg-navy px-5 py-5 sm:px-6">
              <dt className="order-2 text-sm leading-6 text-[#F3EFE5]/70">{label}</dt>
              <dd className="order-1 text-4xl font-black text-[#F3EFE5]">
                <Counter to={value} start={statsSeen} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
