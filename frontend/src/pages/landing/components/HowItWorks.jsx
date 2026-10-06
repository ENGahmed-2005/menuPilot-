/* HowItWorks.jsx — the four steps from the table to the kitchen, in one
   compact row (a list on phones). When the row comes into view, an order
   travels it: the line fills and each step lights up in turn. */
import { useRef } from "react";
import { STEPS } from "./data";
import Reveal from "./Reveal";
import { useInView } from "./useInView";
import SectionHeading from "./SectionHeading";
import { t } from "../../../i18n";

const STEP_DELAY = 350;
// From the first step's dot to the last one's: each dot sits at the start of
// its column, and the four columns have three 1.5rem gaps between them.
const LINE = { insetInlineStart: "20px", insetInlineEnd: "calc((100% - 4.5rem) / 4 - 20px)" };

export default function HowItWorks() {
  const ref = useRef(null);
  const on = useInView(ref, { threshold: 0.6 });
  return (
    <section id="how" className="scroll-mt-24 border-y border-[#F3EFE5]/8 bg-[#F3EFE5] text-[#172331]">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <SectionHeading tone="light" eyebrow={t("كيف يعمل")} title={`${t("من الطاولة إلى المطبخ،")} ${t("بدون فوضى.")}`}>
          {t("تدفق بسيط يجعل كل شخص يعرف ماذا يفعل ومتى — ويقلل الخطوات اليدوية التي تضيع الوقت.")}
        </SectionHeading>
        <ol ref={ref} className="relative mt-9 grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4 lg:gap-6">
          {/* The line that joins the steps on wide screens, and the order filling it. */}
          <span className="pointer-events-none absolute top-5 hidden h-px bg-[#172331]/12 lg:block" style={LINE} aria-hidden="true" />
          <span aria-hidden="true" style={{ ...LINE, transitionDuration: `${STEP_DELAY * (STEPS.length - 1)}ms` }}
            className={`pointer-events-none absolute top-[19px] hidden h-[3px] rounded-full bg-[#E67E22] transition-transform ease-linear ltr:origin-left rtl:origin-right lg:block ${on ? "scale-x-100" : "scale-x-0"}`} />
          {STEPS.map(([number, title, text], i) => (
            <Reveal key={number} as="li" delay={i * 70} className="relative">
              <span style={{ transitionDelay: on ? `${i * STEP_DELAY}ms` : "0ms" }}
                className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-black ring-4 ring-[#F3EFE5] transition-colors duration-300 ${on ? "bg-[#E67E22] text-[#172331]" : "bg-[#172331] text-[#F3EFE5]"}`}>{number}</span>
              <div className="mt-3 lg:mt-4">
                <h3 className="text-lg font-black">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-[#5A6574]">{text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
