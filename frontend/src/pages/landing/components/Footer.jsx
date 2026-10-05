/* Footer.jsx — brand and tagline with the two ways in (start, or try the
   demo), the page's sections, and the language switch. */
import { ArrowLeft } from "lucide-react";
import { NAV_LINKS } from "./data";
import BrandLogo from "../../../components/brand/Logo";
import LanguageSwitch from "../../../components/ui/LanguageSwitch";
import { t } from "../../../i18n";

export default function Footer() {
  return (
    <footer className="border-t border-paper/10 bg-navy-deep">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_auto] md:gap-14">
          <div>
            <BrandLogo on="dark" height={32} />
            <p className="mt-4 max-w-sm text-sm leading-7 text-paper/70">
              {t("نظام إدارة مطاعم مبني ليجعل التشغيل أبسط، الطلبات أسرع، وفريقك أكثر تنسيقًا.")}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href="/register" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#EEA122] px-5 text-sm font-black text-navy-deep transition hover:bg-[#E67E22]">
                {t("ابدأ مع menuPilot")} <ArrowLeft size={16} aria-hidden="true" />
              </a>
              <a href="#demo" className="inline-flex min-h-11 items-center rounded-full border border-paper/15 px-5 text-sm font-bold text-paper/85 transition hover:border-paper/35 hover:bg-paper/5">
                {t("جرّبه دون تسجيل")}
              </a>
            </div>
          </div>

          <nav aria-label={t("الأقسام")}>
            <p className="mb-4 text-xs font-black tracking-[.12em] text-paper/50">{t("الأقسام")}</p>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm text-paper/70 transition hover:text-[#EEA122]">{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="mb-4 text-xs font-black tracking-[.12em] text-paper/50">{t("اللغة")}</p>
            <LanguageSwitch tone="dark" />
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-paper/10 pt-8 text-xs text-paper/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {t("menuPilot. جميع الحقوق محفوظة.")}</p>
          <p>{t("تجربة مجانية 14 يومًا — بدون بطاقة ائتمانية")}</p>
        </div>
      </div>
    </footer>
  );
}
