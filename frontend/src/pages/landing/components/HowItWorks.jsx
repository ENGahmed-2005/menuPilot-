/* HowItWorks.jsx — the four steps from the table to the kitchen, in one
   compact row (a list on phones). */
import { STEPS } from "./data";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import { t } from "../../../i18n";

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 border-y border-[#F3EFE5]/8 bg-[#F3EFE5] text-[#172331]">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
        <SectionHeading tone="light" eyebrow={t("كيف يعمل")} title={`${t("من الطاولة إلى المطبخ،")} ${t("بدون فوضى.")}`}>
          {t("تدفق بسيط يجعل كل شخص يعرف ماذا يفعل ومتى — ويقلل الخطوات اليدوية التي تضيع الوقت.")}
        </SectionHeading>
        <ol className="relative mt-9 grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4 lg:gap-6">
          {/* The line that joins the steps on wide screens. */}
          <span className="pointer-events-none absolute inset-x-6 top-5 hidden h-px bg-[#172331]/12 lg:block" aria-hidden="true" />
          {STEPS.map(([number, title, text], i) => (
            <Reveal key={number} as="li" delay={i * 70} className="relative">
              <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#172331] text-sm font-black text-[#F3EFE5] ring-4 ring-[#F3EFE5]">{number}</span>
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
