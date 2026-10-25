import { Code2, Database, UsersRound } from "lucide-react";
import { t } from "../../../i18n";

const TEAM = [
  {
    name: t("أحمد الكحلوت"),
    role: t("صاحب المشروع · قائد الفريق"),
    icon: UsersRound,
  },
  {
    name: t("علي عابد"),
    role: t("مطوّر الخادم (Laravel)"),
    icon: Database,
  },
  {
    name: t("عمار يحيى عمر العرعير"),
    role: t("شريك · مطوّر الخادم (Laravel)"),
    icon: Database,
  },
  {
    name: t("سجى سقالله"),
    role: t("مطوّرة الواجهات (React)"),
    icon: Code2,
  },
  {
    name: t("رنين ريان"),
    role: t("مطوّرة الواجهات (React)"),
    icon: Code2,
  },
];

export default function TeamSection() {
  return (
    <section id="team" className="relative overflow-hidden border-t border-[#f4efe6]/10 py-24">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(238,161,34,0.10),transparent_45%)]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="mb-4 inline-block font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#e67e22]">
            {t("فريق العمل")}
          </span>
          <h2 className="font-[Aref_Ruqaa] text-4xl font-normal leading-tight text-[#f4efe6] md:text-5xl">
            {t("فريق menuPilot")}
          </h2>
          <p className="mt-5 text-sm leading-7 text-[#f4efe6]/65 md:text-base">
            {t("فريق شغوف يجمع خبرات تطوير الواجهات والخلفيات لابتكار حلول رقمية ذكية تجعل إدارة المطاعم أكثر سهولة وكفاءة.")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map(({ name, role, icon: Icon }, index) => (
            <article
              key={name}
              className={`group rounded-2xl border border-[#f4efe6]/10 bg-[#f4efe6]/[0.035] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#e67e22]/40 hover:bg-[#f4efe6]/[0.06] ${index === 0 ? "lg:col-span-2" : ""}`}
            >
              <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e67e22]/15 text-[#e67e22] transition group-hover:bg-[#e67e22] group-hover:text-[#172331]">
                <Icon size={21} strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-bold text-[#f4efe6]">{name}</h3>
              <p className="mt-2 text-sm leading-6 text-[#f4efe6]/70">{role}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
