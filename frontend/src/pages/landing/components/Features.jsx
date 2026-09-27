import { FEATURES } from "./data";
import Reveal from "./Reveal";

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
      <Reveal className="max-w-2xl">
        <span className="inline-block rounded-full border border-[#EEA122]/25 bg-[#EEA122]/8 px-3 py-1 text-[11px] font-black tracking-[.18em] text-[#EEA122] uppercase">
          المميزات
        </span>
        <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
          كل أدوات التشغيل،{" "}
          <span className="bg-gradient-to-l from-[#EEA122] to-[#E67E22] bg-clip-text text-transparent">
            في مكان واحد.
          </span>
        </h2>
        <p className="mt-5 text-base leading-8 text-[#F3EFE5]/55">
          بدل أن تتوزع عمليات مطعمك بين الورق والرسائل والأنظمة المنفصلة، اجمعها في workflow واحد واضح.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }, i) => (
          <Reveal
            key={title}
            as="article"
            delay={i * 70}
            className="group relative overflow-hidden rounded-2xl border border-[#F3EFE5]/8 bg-[#F3EFE5]/[.025] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#EEA122]/25 hover:bg-[#F3EFE5]/[.04]"
          >
            {/* subtle glow on hover */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#EEA122]/0 blur-2xl transition-all duration-500 group-hover:bg-[#EEA122]/12" />

            <div className="relative">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#EEA122]/10 text-[#EEA122] transition-colors duration-300 group-hover:bg-[#EEA122] group-hover:text-[#1F2420]">
                <Icon size={21} />
              </span>
              <h3 className="mt-5 text-lg font-black">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#F3EFE5]/50">{text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
