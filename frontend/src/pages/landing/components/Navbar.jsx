import { useEffect, useState } from "react";
import BrandLogo from "../../../components/brand/Logo";
import { MenuSquare, X } from "lucide-react";
import { NAV_LINKS } from "./data";
import { lang, setLang } from "../../../i18n";
import { landingCopy } from "./landingCopy";

export default function Navbar({ onNavigate }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const go = (path) => { setMobileOpen(false); onNavigate(path); };
  const toggleLanguage = () => setLang(lang === "en" ? "ar" : "en");

  return (
    <header className={`landing-navbar${scrolled ? " is-scrolled" : ""}`}>
      <div className="landing-navbar-inner">
        <button className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <BrandLogo on="dark" height={36} priority alt="menuPilot" />
        </button>

        <nav className="landing-nav-links" aria-label={landingCopy.navigation}>
          {NAV_LINKS.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
        </nav>

        <div className="landing-nav-actions">
          <button type="button" onClick={toggleLanguage} className="landing-language-switch" aria-label={landingCopy.switchLanguage}>
            <span className={lang === "en" ? "is-active" : ""}>EN</span><i aria-hidden="true">|</i><span className={lang === "ar" ? "is-active" : ""}>عربي</span>
          </button>
          <button onClick={() => go("/login")} className="landing-login">{landingCopy.login}</button>
          <button onClick={() => go("/register")} className="landing-nav-cta">{landingCopy.start}</button>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="landing-menu-toggle"
          aria-label={landingCopy.navigation}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={19} /> : <MenuSquare size={19} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="landing-mobile-drawer">
          <nav className="landing-mobile-links" aria-label={landingCopy.navigation}>
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>{link.label}</a>
            ))}
          </nav>
          <div className="landing-mobile-actions">
            <button type="button" onClick={toggleLanguage} className="landing-language-switch" aria-label={landingCopy.switchLanguage}>
              <span className={lang === "en" ? "is-active" : ""}>EN</span><i aria-hidden="true">|</i><span className={lang === "ar" ? "is-active" : ""}>عربي</span>
            </button>
            <button onClick={() => go("/login")} className="landing-mobile-login">{landingCopy.login}</button>
            <button onClick={() => go("/register")} className="landing-mobile-cta">{landingCopy.start}</button>
          </div>
        </div>
      )}
    </header>
  );
}
