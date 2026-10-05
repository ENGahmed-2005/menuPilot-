/* Roles.jsx — each role has its own workspace: four compact cards. A role
   with a screen in the product tour can open it there. */
import { ROLES } from "./data";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import { t } from "../../../i18n";

const ACCENTS = ["#EEA122", "#4B6A8A", "#4A7FA5", "#8B6FB5"];
const TOUR = ["dashboard", "kitchen", "cashier", null]; // owner, kitchen, cashier, waiter

const showInTour = (id) => window.dispatchEvent(new CustomEvent("menupilot:tour", { detail: id }));

export default function Roles() {
  return (
    <section id="roles" className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-10 pt-16 sm:px-8 lg:px-10 lg:pb-12 lg:pt-20">
      <SectionHeading eyebrow={t("الأدوار")} title={t("كل دور له مساحة عمله.")}>
        {t("من الإدارة إلى المطبخ والكاشير والويتر — menuPilot يربط الفريق بنفس دورة الطلب.")}
      </SectionHeading>
      <div className="mt-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ROLES.map(([Icon, title, text], i) => (
          <Reveal key={title} delay={i * 70} className="flex flex-col rounded-2xl border border-[#F3EFE5]/10 bg-[#F3EFE5]/[.03] p-4 sm:p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ backgroundColor: `${ACCENTS[i]}1f`, color: ACCENTS[i] }}>
              <Icon size={20} aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-black">{title}</h3>
            <p className="mt-1 flex-1 text-sm leading-6 text-[#F3EFE5]/70">{text}</p>
            {TOUR[i] && (
              <button type="button" onClick={() => showInTour(TOUR[i])}
                className="mt-3 inline-flex min-h-10 items-center self-start text-sm font-bold text-[#EEA122] underline-offset-4 hover:underline">
                {t("شاهد شاشته")}
              </button>
            )}
          </Reveal>
        ))}
      </div>
    </section>
  );
}
