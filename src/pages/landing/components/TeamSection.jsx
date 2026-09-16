import { Code2, Database, UsersRound } from "lucide-react";

const TEAM = [
  {
    name: "أحمد الكحلوت",
    role: "Owner · Team Leader",
    icon: UsersRound,
  },
  {
    name: "علي عابد",
    role: "Laravel Backend Developer",
    icon: Database,
  },
  {
    name: "عمار يحيى عمر العرعير",
    role: "Co-Owner · Laravel Backend Developer",
    icon: Database,
  },
  {
    name: "Saja Saqallah",
    role: "React Frontend Developer",
    icon: Code2,
  },
  {
    name: "Raneen Rayan",
    role: "React Developer",
    icon: Code2,
  },
];

export default function TeamSection() {
  return (
    <section id="team" className="relative overflow-hidden border-t border-[#F3EFE5]/10 py-24">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(238,161,34,0.10),transparent_45%)]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="mb-4 inline-block font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#EEA122]">
            The Team
          </span>
          <h2 className="font-[Aref_Ruqaa] text-4xl font-normal leading-tight text-[#F3EFE5] md:text-5xl">
            فريق menuPilot
          </h2>
          <p className="mt-5 text-sm leading-7 text-[#F3EFE5]/65 md:text-base">
            فريق شغوف يجمع خبرات تطوير الواجهات والخلفيات لابتكار حلول رقمية ذكية تجعل إدارة المطاعم أكثر سهولة وكفاءة.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map(({ name, role, icon: Icon }, index) => (
            <article
              key={name}
              className={`group rounded-2xl border border-[#F3EFE5]/10 bg-[#F3EFE5]/[0.035] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#EEA122]/40 hover:bg-[#F3EFE5]/[0.06] ${index === 0 ? "lg:col-span-2" : ""}`}
            >
              <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EEA122]/15 text-[#EEA122] transition group-hover:bg-[#EEA122] group-hover:text-[#1F2420]">
                <Icon size={21} strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-bold text-[#F3EFE5]">{name}</h3>
              <p className="mt-2 text-sm leading-6 text-[#F3EFE5]/55">{role}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
