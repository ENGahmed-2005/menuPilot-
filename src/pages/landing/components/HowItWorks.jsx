/* ==========================================================================
   HowItWorks.jsx — قسم "من الطاولة إلى المطبخ، بدون فوضى."
   ========================================================================== */
import { STEPS } from "./data";
import Reveal from "./Reveal";

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-[#F3EFE5]/10 bg-[#F3EFE5] text-[#1F2420]">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[.7fr_1.3fr] lg:items-start">
          <Reveal className="lg:sticky lg:top-28">
            <span className="text-xs font-black tracking-[.2em] text-[#E67E22]">HOW IT WORKS</span>
            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">من الطاولة إلى المطبخ، بدون فوضى.</h2>
            <p className="mt-5 max-w-lg text-base leading-8 text-[#4B5147]">
              تدفق بسيط يجعل كل شخص يعرف ماذا يفعل ومتى، ويقلل الخطوات اليدوية التي تضيع الوقت.
            </p>
          </Reveal>
          <div className="grid gap-3 sm:grid-cols-2">
            {STEPS.map(([number, title, text], i) => (
              <Reveal
                key={number}
                as="article"
                delay={i * 90}
                className="rounded-3xl border border-[#1F2420]/10 bg-white/60 p-7 transition-shadow duration-300 hover:shadow-xl hover:shadow-[#1F2420]/5"
              >
                <span className="text-sm font-black text-[#E67E22]">{number}</span>
                <h3 className="mt-12 text-2xl font-black">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#4B5147]">{text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
