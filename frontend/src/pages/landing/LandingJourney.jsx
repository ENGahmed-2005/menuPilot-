import { ArrowLeft } from "lucide-react";
import { landingCopy } from "./landing-data";
import LandingReveal from "./LandingReveal";

export default function LandingJourney() {
  const FlowArrow = ArrowLeft;

  return (
    <section id="journey" className="lp-section lp-journey" aria-labelledby="lp-journey-title">
      <div className="lp-container">
        <div className="lp-journey-heading">
          <p className="lp-eyebrow">{landingCopy.journey.eyebrow}</p>
          <h2 id="lp-journey-title" className="lp-section-title">{landingCopy.journey.title}</h2>
        </div>
        <LandingReveal className="lp-journey-reveal">
          <ol className="lp-journey-steps">
            {landingCopy.journey.steps.map((step, index) => (
              <li key={step.number}>
                <span className="lp-journey-number">{step.number}</span>
                <div className="lp-journey-copy">
                  <h3>{step.label}</h3>
                  <p>{step.description}</p>
                </div>
                {index < landingCopy.journey.steps.length - 1 && <FlowArrow className="lp-journey-arrow" aria-hidden="true" size={20} />}
              </li>
            ))}
          </ol>
        </LandingReveal>
      </div>
    </section>
  );
}
