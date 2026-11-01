import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpLeft, Menu, Utensils, X } from "lucide-react";

const MotionSpan = motion.span;

export default function LandingNavbar({ content, language, onToggleLanguage }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="mp-navbar-wrap">
      <nav className="mp-navbar" aria-label={content.nav.menuLabel}>
        <a className="mp-brand" href="#hero" aria-label={content.brand}>
          <span className="mp-brand-mark" aria-hidden="true">
            <Utensils size={19} strokeWidth={1.8} />
          </span>
          <span>{content.brand}</span>
        </a>

        <div className="mp-nav-links">
          <a href="#features">{content.nav.features}</a>
          <a href="#journey">{content.nav.howItWorks}</a>
          <a href="#pricing">{content.nav.pricing}</a>
        </div>

        <div className="mp-nav-actions">
          <button
            className="mp-language-switch"
            type="button"
            onClick={onToggleLanguage}
            aria-label={content.nav.switchLanguage}
          >
            <span className={language === "ar" ? "is-active" : ""}>AR</span>
            <span className="mp-language-divider" aria-hidden="true" />
            <span className={language === "en" ? "is-active" : ""}>EN</span>
            <MotionSpan
              className="mp-language-indicator"
              animate={{ x: language === "ar" ? 0 : 25 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              aria-hidden="true"
            />
          </button>
          <a className="mp-nav-cta" href="#hero">
            <span>{content.nav.start}</span>
            <ArrowUpLeft size={16} aria-hidden="true" />
          </a>
          <button
            className="mp-mobile-menu"
            type="button"
            aria-label={content.nav.menuLabel}
            aria-expanded={menuOpen}
            aria-controls="mp-mobile-nav-panel"
            onClick={() => setMenuOpen((isOpen) => !isOpen)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </nav>
      {menuOpen && (
        <div className="mp-mobile-nav-panel" id="mp-mobile-nav-panel">
          <a href="#features" onClick={() => setMenuOpen(false)}>
            {content.nav.features}
          </a>
          <a href="#journey" onClick={() => setMenuOpen(false)}>
            {content.nav.howItWorks}
          </a>
          <a href="#pricing" onClick={() => setMenuOpen(false)}>
            {content.nav.pricing}
          </a>
          <a className="mp-mobile-nav-cta" href="#hero" onClick={() => setMenuOpen(false)}>
            {content.nav.start}
            <ArrowUpLeft className="mp-directional-arrow" size={16} />
          </a>
        </div>
      )}
    </header>
  );
}
