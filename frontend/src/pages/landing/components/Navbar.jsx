import { useEffect, useState } from "react";
import { MenuSquare, X } from "lucide-react";
import { NAV_LINKS } from "./data";

const Logo = ({ className = "h-9" }) => (
  <span className="inline-flex shrink-0 items-center">
    <img src="/menuPilot-logo.svg" alt="menuPilot" className={`${className} w-auto`} />
  </span>
);

export default function Navbar({ onNavigate }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const go = (path) => { setMobileOpen(false); onNavigate(path); };

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      {/*
        The outer padding is what creates the floating "narrowed" appearance —
        padding itself transitions very smoothly, no max-width jumps.
      */}
      <div
        style={{
          padding: scrolled ? "10px 20px 0" : "0",
          transition: "padding 450ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <header
          style={{
            borderRadius: scrolled ? "16px" : "0px",
            background: scrolled ? "rgba(31,36,32,0.96)" : "rgba(31,36,32,0)",
            boxShadow: scrolled ? "0 8px 32px rgba(0,0,0,0.28)" : "none",
            borderBottom: scrolled ? "1px solid rgba(243,239,229,0.10)" : "1px solid rgba(243,239,229,0.08)",
            backdropFilter: scrolled ? "blur(20px)" : "blur(12px)",
            transition: [
              "border-radius 450ms cubic-bezier(0.4, 0, 0.2, 1)",
              "background 450ms cubic-bezier(0.4, 0, 0.2, 1)",
              "box-shadow 450ms cubic-bezier(0.4, 0, 0.2, 1)",
              "border-color 450ms cubic-bezier(0.4, 0, 0.2, 1)",
            ].join(", "),
          }}
        >
          <div
            className="mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10"
            style={{
              height: scrolled ? "3.5rem" : "4.25rem",
              transition: "height 450ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {/* Logo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center"
            >
              <img
                src="/menuPilot-logo.svg"
                alt="menuPilot"
                style={{
                  height: scrolled ? "1.75rem" : "2.25rem",
                  width: "auto",
                  transition: "height 450ms cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </button>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-7 text-sm text-[#F3EFE5]/65 md:flex">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="relative py-1 transition-colors duration-200 hover:text-[#EEA122] after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-right after:scale-x-0 after:bg-[#EEA122] after:transition-transform after:duration-300 hover:after:origin-left hover:after:scale-x-100"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* CTA */}
            <div className="hidden items-center gap-3 sm:flex">
              <button
                onClick={() => go("/login")}
                className="rounded-full px-4 py-2 text-sm font-semibold text-[#F3EFE5]/70 transition-colors duration-200 hover:text-[#F3EFE5]"
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => go("/register")}
                className="rounded-full bg-[#EEA122] px-5 py-2.5 text-sm font-black text-[#1F2420] transition-all duration-200 hover:bg-[#E67E22] active:scale-95"
              >
                جرّب مجانًا 14 يومًا
              </button>
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-[#F3EFE5]/12 transition hover:bg-[#F3EFE5]/5 md:hidden"
              aria-label="القائمة"
            >
              {mobileOpen ? <X size={19} /> : <MenuSquare size={19} />}
            </button>
          </div>

          {/* Mobile drawer */}
          {mobileOpen && (
            <div className="border-t border-[#F3EFE5]/8 bg-[#1F2420]/98 px-5 py-5 backdrop-blur-xl md:hidden"
              style={{ borderBottomLeftRadius: scrolled ? "16px" : "0", borderBottomRightRadius: scrolled ? "16px" : "0" }}
            >
              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-4 py-3 text-sm font-medium text-[#F3EFE5]/70 transition hover:bg-[#F3EFE5]/5 hover:text-[#EEA122]"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="mt-4 flex flex-col gap-2 border-t border-[#F3EFE5]/8 pt-4">
                <button onClick={() => go("/login")} className="rounded-xl border border-[#F3EFE5]/12 px-4 py-3 text-sm font-semibold text-[#F3EFE5]/80 transition hover:bg-[#F3EFE5]/5">تسجيل الدخول</button>
                <button onClick={() => go("/register")} className="rounded-xl bg-[#EEA122] px-4 py-3 text-sm font-black text-[#1F2420] transition hover:bg-[#E67E22]">جرّب مجانًا 14 يومًا</button>
              </div>
            </div>
          )}
        </header>
      </div>
    </div>
  );
}
