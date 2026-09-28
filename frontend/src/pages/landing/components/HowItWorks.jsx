import { STEPS } from "./data";
import Reveal from "./Reveal";

export default function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 border-y border-[#F3EFE5]/8 bg-[#F3EFE5] text-[#172331]">
      <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
        <div className="grid gap-16 lg:grid-cols-[.6fr_1.4fr] lg:items-start">

          {/* Left: sticky heading */}
          <Reveal className="lg:sticky lg:top-28">
            <span className="inline-block rounded-full border border-[#E67E22]/30 bg-[#E67E22]/8 px-3 py-1 text-[11px] font-black tracking-[.18em] text-[#E67E22] uppercase">
              كيف يعمل
            </span>
            <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
              من الطاولة إلى المطبخ،<br />
              <span className="text-[#E67E22]">بدون فوضى.</span>
            </h2>
            <p className="mt-5 max-w-sm text-base leading-8 text-[#5A6574]">
              تدفق بسيط يجعل كل شخص يعرف ماذا يفعل ومتى — ويقلل الخطوات اليدوية التي تضيع الوقت.
            </p>
          </Reveal>

          {/* Right: step cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {STEPS.map(([number, title, text], i) => (
              <Reveal
                key={number}
                as="article"
                delay={i * 80}
                className="group relative overflow-hidden rounded-2xl border border-[#172331]/8 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#172331]/8"
              >
                {/* Step number badge */}
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#E67E22]/10 text-sm font-black text-[#E67E22]">
                  {number}
                </span>
                <h3 className="mt-5 text-xl font-black">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#5A6574]">{text}</p>

                {/* corner accent */}
                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-0 bg-[#E67E22] transition-all duration-500 group-hover:w-full" />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
