import { NAV_LINKS } from "./data";
import BrandLogo from "../../../components/brand/Logo";

export default function Footer() {
  return (
    <footer className="border-t border-[#F3EFE5]/8 bg-[#172331]">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
        <div className="grid gap-10 md:grid-cols-[1fr_auto]">

          {/* Brand */}
          <div>
            <BrandLogo on="dark" height={32} />
            <p className="mt-4 max-w-xs text-sm leading-7 text-[#F3EFE5]/70">
              نظام إدارة مطاعم مبني ليجعل التشغيل أبسط، الطلبات أسرع، وفريقك أكثر تنسيقًا.
            </p>
          </div>

          {/* Nav */}
          <div>
            <p className="mb-4 text-[11px] font-black tracking-[.15em] text-[#F3EFE5]/30 uppercase">الأقسام</p>
            <nav className="flex flex-col gap-2.5">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-[#F3EFE5]/70 transition hover:text-[#EEA122]"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[#F3EFE5]/8 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#F3EFE5]/30">© {new Date().getFullYear()} menuPilot. جميع الحقوق محفوظة.</p>
          <p className="text-xs text-[#F3EFE5]/25">تجربة مجانية 14 يومًا — بدون بطاقة ائتمانية</p>
        </div>
      </div>
    </footer>
  );
}
