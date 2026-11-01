import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "../../components/brand/Logo";
import LanguageSwitch from "../../components/ui/LanguageSwitch";
import { c, landingCopy } from "./landing-data";

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("");

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    const sections = landingCopy.navigation
      .map(({ href }) => document.querySelector(href))
      .filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveHref(`#${entry.target.id}`);
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <>
      <a className="lp-skip-link" href="#main">{c("تخطَّ إلى المحتوى", "Skip to content")}</a>
      <header className={`lp-header${scrolled ? " is-scrolled" : ""}`}>
        <div className="lp-header-inner">
          <Link to="/" className="lp-logo" aria-label={c("menuPilot، الصفحة الرئيسية", "menuPilot home")}>
            <Logo height={36} priority />
          </Link>
          <nav className="lp-nav" aria-label={c("التنقل الرئيسي", "Main navigation")}>
            {landingCopy.navigation.map(({ href, label }) => <a className={activeHref === href ? "is-active" : ""} href={href} key={href}>{label}</a>)}
          </nav>
          <div className="lp-header-actions">
            <LanguageSwitch />
            <Link to="/register" className="lp-header-cta">{c("ابدأ مجانًا", "Start free")}</Link>
          </div>
          <button
            className="lp-menu-toggle"
            type="button"
            aria-label={menuOpen ? c("إغلاق القائمة", "Close menu") : c("فتح القائمة", "Open menu")}
            aria-controls="lp-mobile-nav"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
        {menuOpen && (
          <nav id="lp-mobile-nav" className="lp-mobile-nav" aria-label={c("التنقل الرئيسي", "Main navigation")}>
            {landingCopy.navigation.map(({ href, label }, index) => (
              <a href={href} key={href} onClick={() => setMenuOpen(false)}><span>{String(index + 1).padStart(2, "0")}</span>{label}</a>
            ))}
          </nav>
        )}
      </header>
    </>
  );
}
