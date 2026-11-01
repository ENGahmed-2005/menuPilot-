import { lang } from "../../i18n";

const members = [
  {
    name: ["أحمد الكحلوت", "Ahmed Al-Kahlout"],
    role: ["صاحب المشروع وقائد الفريق", "Project Owner and Team Lead"],
    station: ["القيادة", "LEADERSHIP"],
    initials: "AA",
    head: true,
  },
  {
    name: ["علي أبو سويلم", "Ali Abu Suwailem"],
    role: ["مطوّر الخادم (Laravel)", "Backend Developer, Laravel"],
    station: ["الخادم", "BACKEND"],
    initials: "AS",
  },
  {
    name: ["عمار يحيى عمر العرعير", "Ammar Yahya Omar Al-Areer"],
    role: ["شريك ومطوّر الخادم (Laravel)", "Partner and Backend Developer, Laravel"],
    station: ["الخادم", "BACKEND"],
    initials: "AA",
  },
  {
    name: ["سجى ساق الله", "Saja Sakallah"],
    role: ["مطوّرة الواجهات (React)", "Frontend Developer, React"],
    station: ["الواجهات", "FRONTEND"],
    initials: "SS",
  },
  {
    name: ["رنين ريان", "Raneen Rayyan"],
    role: ["مطوّرة الواجهات (React)", "Frontend Developer, React"],
    station: ["الواجهات", "FRONTEND"],
    initials: "RR",
  },
];

export const landingTeam = {
  eyebrow: lang === "en" ? "THE MENUPILOT TEAM" : "فريق MenuPilot",
  title: lang === "en" ? "Meet the people behind MenuPilot." : "تعرّف على فريق MenuPilot.",
  description: lang === "en"
    ? "Product leadership, backend, and frontend engineering—working together on MenuPilot."
    : "فريق يجمع قيادة المنتج وتطوير الخادم والواجهات.",
  members: members.map((member) => ({
    name: member.name[lang === "en" ? 1 : 0],
    role: member.role[lang === "en" ? 1 : 0],
    station: member.station[lang === "en" ? 1 : 0],
    initials: member.initials,
    head: Boolean(member.head),
  })),
};
