import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { lang } from "../../i18n";
import { landingCopy } from "./landing-data";
import LandingReveal from "./LandingReveal";

export default function LandingClarity() {
  const FlowArrow = lang === "ar" ? ArrowDownLeft : ArrowUpRight;

  return (
    <section id="clarity" className="lp-clarity lp-section" aria-labelledby="lp-clarity-title">
      <div className="lp-container lp-clarity-layout">
        <header className="lp-clarity-heading">
          <p className="lp-eyebrow">{landingCopy.clarity.eyebrow}</p>
          <h2 id="lp-clarity-title" className="lp-section-title">{landingCopy.clarity.title}</h2>
          <p className="lp-clarity-description">{landingCopy.clarity.description}</p>
        </header>
        <LandingReveal className="lp-clarity-diagram">
          <div role="group" aria-label={landingCopy.clarity.diagramLabel}>
            <div className="lp-clarity-loose">
              {landingCopy.clarity.inputs.map((input, index) => (
                <span className={`lp-clarity-input lp-clarity-input-${index + 1}`} key={input}>
                  <i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i>{input}
                </span>
              ))}
            </div>
            <FlowArrow className="lp-clarity-arrow" size={27} strokeWidth={1.3} aria-hidden="true" />
            <div className="lp-clarity-result">
              <span className="lp-clarity-result-mark" aria-hidden="true">m</span>
              <div>
                <strong>menuPilot</strong>
                <span>{landingCopy.clarity.result}</span>
              </div>
            </div>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
