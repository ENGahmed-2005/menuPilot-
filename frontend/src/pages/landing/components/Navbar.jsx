import { useState } from "react";
import { MenuSquare } from "lucide-react";
import { NAV_LINKS } from "./data";

const Logo = ({ className = "h-10" }) => (
  <span className="brand-logo-surface inline-flex shrink-0 items-center">
    <img src="/menuPilot-logo.svg" alt="menuPilot" className={`brand-logo ${className} w-auto`} />
  </span>
);

export default function Navbar({ onNavigate }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const go = (path) => { setMobileOpen(false); onNavigate(path); };

  return (
    <header className="sticky top-0 z-50 border-b border-[#F3EFE5]/10 bg-[#1F2420]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center">
          <Logo />
        </button>

        <nav className="hidden items-center gap-8 text-sm text-[#F3EFE5]/70 md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-[#EEA122]">{link.label}</a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <button onClick={() => go("/login")} className="rounded-full px-4 py-2 text-sm font-bold text-[#F3EFE5]/80 transition hover:text-[#F3EFE5]">تسجيل الدخول</button>
          <button onClick={() => go("/register")} className="rounded-full bg-[#EEA122] px-5 py-2.5 text-sm font-black text-[#1F2420] transition hover:bg-[#E67E22]">جرّب مجانًا 14 يومًا</button>
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-xl border border-[#F3EFE5]/15 p-2.5 md:hidden" aria-label="فتح القائمة">
          <MenuSquare size={21} />
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#F3EFE5]/10 bg-[#1F2420] px-5 py-5 md:hidden">
          <div className="flex flex-col gap-4 text-sm">
            {NAV_LINKS.map((link) => <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>{link.label}</a>)}
            <button onClick={() => go("/login")} className="rounded-xl border border-[#F3EFE5]/15 px-4 py-3">تسجيل الدخول</button>
            <button onClick={() => go("/register")} className="rounded-xl bg-[#EEA122] px-4 py-3 font-black text-[#1F2420]">جرّب مجانًا 14 يومًا</button>
          </div>
        </div>
      )}
    </header>
  );
}
