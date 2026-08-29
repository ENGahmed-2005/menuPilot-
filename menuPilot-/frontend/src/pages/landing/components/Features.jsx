/* ==========================================================================
   Features.jsx — قسم "كل أدوات التشغيل، في مكان واحد."
   ========================================================================== */
import { FEATURES } from "./data";
import Reveal from "./Reveal";

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
      <Reveal className="max-w-2xl">
        <span className="text-xs font-black tracking-[.2em] text-[#EEA122]">WHY MENUPILOT</span>
        <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">كل أدوات التشغيل، في مكان واحد.</h2>
        <p className="mt-5 text-lg leading-8 text-[#F3EFE5]/55">
          بدل أن تتوزع عمليات المطعم بين الورق والرسائل والأنظمة المنفصلة، اجمعها في workflow واحد واضح.
        </p>
      </Reveal>
      <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }, i) => (
          <Reveal
            key={title}
            as="article"
            delay={i * 80}
            className="group rounded-3xl border border-[#F3EFE5]/10 bg-[#F3EFE5]/[.025] p-7 transition-[transform,background-color,border-color] duration-300 hover:-translate-y-1.5 hover:border-[#EEA122]/30 hover:bg-[#EEA122]/[.04]"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#EEA122]/10 text-[#EEA122] transition group-hover:bg-[#EEA122] group-hover:text-[#1F2420]">
              <Icon size={23} />
            </span>
            <h3 className="mt-6 text-xl font-black">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-[#F3EFE5]/55">{text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
