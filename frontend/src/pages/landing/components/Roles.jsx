import { ROLES } from "./data";
import Reveal from "./Reveal";

/* One accent colour per role for visual distinction */
const ACCENTS = ["#EEA122", "#4B6A8A", "#4A7FA5", "#8B6FB5"];

export default function Roles() {
  return (
    <section id="roles" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8 lg:px-10 lg:py-32">
      <Reveal className="text-center">
        <span className="inline-block rounded-full border border-[#EEA122]/25 bg-[#EEA122]/8 px-3 py-1 text-[11px] font-black tracking-[.18em] text-[#EEA122] uppercase">
          الأدوار
        </span>
        <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
          كل دور له مساحة عمله.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#F3EFE5]/70">
          من الإدارة إلى المطبخ والكاشير والويتر — menuPilot يربط الفريق بنفس دورة الطلب.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map(([Icon, title, text], i) => {
          const accent = ACCENTS[i] || "#EEA122";
          return (
            <Reveal
              key={title}
              delay={i * 80}
              className="group relative overflow-hidden rounded-2xl border border-[#F3EFE5]/8 p-7 transition-all duration-300 hover:-translate-y-1.5"
              style={{ "--accent": accent }}
            >
              {/* glow */}
              <div
                className="pointer-events-none absolute -left-6 -top-6 h-20 w-20 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                style={{ backgroundColor: accent + "20" }}
              />

              <div className="relative">
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl transition-colors duration-300"
                  style={{
                    backgroundColor: accent + "18",
                    color: accent,
                  }}
                >
                  <Icon size={22} />
                </span>
                <h3 className="mt-6 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#F3EFE5]/70">{text}</p>
              </div>

              {/* bottom border accent on hover */}
              <div
                className="absolute bottom-0 right-0 h-0.5 w-0 transition-all duration-500 group-hover:w-full"
                style={{ backgroundColor: accent }}
              />
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
