import { BookOpen, ChefHat, ClipboardList } from "lucide-react";
import { landingCopy } from "./landing-data";
import LandingReveal from "./LandingReveal";

const icons = [ClipboardList, BookOpen, ChefHat];

export default function LandingBenefits() {
  return (
    <section id="benefits" className="lp-benefits lp-section" aria-labelledby="lp-benefits-title">
      <div className="lp-container">
        <header className="lp-benefits-heading">
          <p className="lp-eyebrow">{landingCopy.benefits.eyebrow}</p>
          <h2 id="lp-benefits-title" className="lp-section-title">{landingCopy.benefits.title}</h2>
        </header>
        <LandingReveal className="lp-benefit-list">
          {landingCopy.benefits.items.map((item, index) => {
            const Icon = icons[index];
            return (
              <article className={`lp-benefit lp-benefit-${index + 1}`} key={item.number}>
                <span className="lp-benefit-number">{item.number}</span>
                <Icon className="lp-benefit-icon" size={23} strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <span className="lp-benefit-index" aria-hidden="true">/ 0{index + 1}</span>
              </article>
            );
          })}
        </LandingReveal>
      </div>
    </section>
  );
}
