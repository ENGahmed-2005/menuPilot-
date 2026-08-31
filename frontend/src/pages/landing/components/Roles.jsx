/* ==========================================================================
   Roles.jsx — قسم "كل دور له مساحة عمله."
   ========================================================================== */
import { ROLES } from "./data";
import Reveal from "./Reveal";

export default function Roles() {
  return (
    <section id="roles" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
      <Reveal className="text-center">
        <span className="text-xs font-black tracking-[.2em] text-[#EEA122]">ONE PLATFORM</span>
        <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">كل دور له مساحة عمله.</h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#F3EFE5]/55">
          من الإدارة إلى المطبخ والكاشير والويتر، menuPilot يربط الفريق بنفس دورة الطلب.
        </p>
      </Reveal>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map(([Icon, title, text], i) => (
          <Reveal
            key={title}
            delay={i * 80}
            className="rounded-3xl border border-[#F3EFE5]/10 p-6 transition-[transform,border-color,background-color] duration-300 hover:-translate-y-1.5 hover:border-[#EEA122]/30 hover:bg-[#F3EFE5]/[.025]"
          >
            <Icon size={24} className="text-[#EEA122]" />
            <h3 className="mt-7 text-xl font-black">{title}</h3>
            <p className="mt-2 text-sm leading-7 text-[#F3EFE5]/55">{text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
