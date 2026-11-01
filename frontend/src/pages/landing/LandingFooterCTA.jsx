import { Link } from "react-router-dom";
import { landingCopy } from "./landing-data";

export default function LandingFooterCTA() {
  return (
    <section className="lp-final" aria-labelledby="lp-final-title">
      <div className="lp-container lp-final-inner">
        <h2 id="lp-final-title">{landingCopy.final.title}</h2>
        <Link to="/register" className="lp-button lp-button-primary">{landingCopy.final.button}</Link>
        <p className="lp-trial-note">{landingCopy.final.note}</p>
      </div>
    </section>
  );
}
