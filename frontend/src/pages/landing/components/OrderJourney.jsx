import { BarChart3, ChefHat, Receipt, Smartphone, UserRound } from "lucide-react";
import { lang } from "../../../i18n";
import { shot } from "./shots";
import { landingCopy } from "./landingCopy";

const STAGES = [
  { id: "guest", icon: Smartphone, image: "menu" },
  { id: "floor", icon: UserRound, image: "tracking" },
  { id: "kitchen", icon: ChefHat, image: "kitchen" },
  { id: "checkout", icon: Receipt, image: "cashier" },
  { id: "insight", icon: BarChart3, image: "dashboard" },
];

export default function OrderJourney() {
  return (
    <section id="order-journey" className="landing-journey" aria-labelledby="landing-journey-title">
      <header className="landing-journey-header">
        <p className="landing-section-kicker"><span />{landingCopy.journeyKicker}</p>
        <div className="landing-journey-heading">
          <h2 id="landing-journey-title">{landingCopy.journeyTitle}</h2>
          <p>{landingCopy.journeyDescription}</p>
        </div>
        <a href="#features" className="landing-journey-explore">{landingCopy.journeyExplore}<span aria-hidden="true">↘</span></a>
      </header>
      <div className="landing-journey-rail">
        <div className="landing-journey-thread" aria-hidden="true"><span /></div>
        <div className="landing-journey-track" aria-label={landingCopy.journeyTrackLabel}>
          {STAGES.map((stage, index) => {
            const copy = landingCopy.journeyStages[stage.id];
            const Icon = stage.icon;
            return (
              <article className={`landing-stop landing-stop-${stage.id}`} key={stage.id}>
                <div className="landing-stop-heading">
                  <span className="landing-stop-number">{String(index + 1).padStart(2, "0")}</span>
                  <Icon size={18} aria-hidden="true" />
                  <span className="landing-stop-arrow" aria-hidden="true">{lang === "ar" ? "←" : "→"}</span>
                </div>
                <div className="landing-stop-scene">
                  <img src={shot(stage.image)} alt={copy.imageAlt} loading="lazy" decoding="async" />
                  <span>{copy.stamp}</span>
                </div>
                <p className="landing-stop-time">{copy.time}</p>
                <h3>{copy.title}</h3>
                <p className="landing-stop-copy">{copy.description}</p>
                <p className="landing-stop-foot">{copy.footer}</p>
              </article>
            );
          })}
        </div>
      </div>
      <div className="landing-journey-footer">
        <span>{landingCopy.journeyHint}</span>
        <span className="landing-journey-count">01 <i /> 05</span>
      </div>
    </section>
  );
}
