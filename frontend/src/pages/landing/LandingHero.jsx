import { Link } from "react-router-dom";
import { ArrowDown } from "lucide-react";
import { lang } from "../../i18n";
import { landingCopy } from "./landing-data";

export default function LandingHero() {
  return (
    <section className="lp-hero" aria-labelledby="lp-title">
      <div className="lp-container">
        <div className="lp-hero-copy">
          <p className="lp-eyebrow">{landingCopy.hero.eyebrow}</p>
          <h1 id="lp-title">{landingCopy.hero.title}<br /><span>{landingCopy.hero.highlight}</span></h1>
          <p className="lp-hero-description">{landingCopy.hero.description}</p>
          <div className="lp-hero-actions">
            <Link to="/register" className="lp-button lp-button-primary">
              {landingCopy.hero.primary}
            </Link>
            <a href="#journey" className="lp-text-link">
              {landingCopy.hero.secondary}<ArrowDown size={15} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="lp-hero-visual">
          <div className="lp-hero-product">
            <div className="lp-hero-product-bar">
              <span>{landingCopy.hero.previewLabel}</span>
              <span className="lp-product-mark"><i aria-hidden="true" />menuPilot</span>
            </div>
            <img
              src={`/landing/${lang}-cashier.webp`}
              alt={landingCopy.hero.previewAlt}
              width="1600"
              height="1000"
              fetchPriority="high"
            />
          </div>
          <p className="lp-hero-image-note">{landingCopy.hero.previewCaption}</p>
        </div>
      </div>
    </section>
  );
}
