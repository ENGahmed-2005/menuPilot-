/* TeamSection.jsx — the people behind menuPilot, inside LandingPage's #team
   section: five equal cards (one row on wide screens; two columns on phones,
   the lead on its own row), each with initials and the person's role. */
import SectionHeading from "./SectionHeading";
import { t } from "../../../i18n";

const TEAM = [
  { name: t("أحمد الكحلوت"), role: t("صاحب المشروع · قائد الفريق"), lead: true },
  { name: t("علي عابد"), role: t("مطوّر الخادم (Laravel)") },
  { name: t("عمار يحيى عمر العرعير"), role: t("شريك · مطوّر الخادم (Laravel)") },
  { name: t("سجى سقالله"), role: t("مطوّرة الواجهات (React)") },
  { name: t("رنين ريان"), role: t("مطوّرة الواجهات (React)") },
];

// First letters of the first and last name: «أحمد الكحلوت» → «أ ك».
const initials = (name) => {
  const words = name.replace(/^ال/, "").split(/\s+/).filter(Boolean);
  const pick = (word) => word.replace(/^ال/, "").charAt(0);
  return words.length > 1 ? `${pick(words[0])} ${pick(words[words.length - 1])}` : pick(words[0] || "");
};

export default function TeamSection() {
  return (
    <div className="relative overflow-hidden py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(238,161,34,0.10),transparent_45%)]" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <SectionHeading center eyebrow={t("فريق العمل")} title={t("فريق menuPilot")}>
          {t("فريق شغوف يجمع خبرات تطوير الواجهات والخلفيات لابتكار حلول رقمية ذكية تجعل إدارة المطاعم أكثر سهولة وكفاءة.")}
        </SectionHeading>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {TEAM.map(({ name, role, lead }) => (
            <li key={name} className={`flex flex-col items-center rounded-2xl border p-5 text-center transition-colors ${lead ? "col-span-2 border-[#EEA122]/35 bg-[#EEA122]/[.06] lg:col-span-1" : "border-paper/10 bg-paper/[.03] hover:border-paper/20"}`}>
              <span className={`grid h-14 w-14 place-items-center rounded-full text-lg font-black ${lead ? "bg-[#EEA122] text-navy-deep" : "bg-paper/10 text-paper"}`} aria-hidden="true">
                {initials(name)}
              </span>
              <h3 className="mt-4 text-base font-black leading-6 text-paper">{name}</h3>
              <p className="mt-1 text-sm leading-6 text-paper/70">{role}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
