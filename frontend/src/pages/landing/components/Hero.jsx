import { ArrowLeft, ArrowRight, Play, QrCode } from "lucide-react";
import Reveal from "./Reveal";
import { landingCopy } from "./landingCopy";
import { lang } from "../../../i18n";

export default function Hero({ onNavigate }) {
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <section className="landing-hero">
      <div className="landing-hero-inner">
        <Reveal className="landing-hero-copy">
          <div className="landing-eyebrow"><span />{landingCopy.eyebrow}</div>
          <h1>
            <span className="landing-headline-line">{landingCopy.headline}</span>
            <span className="landing-headline-line landing-headline-outline">{landingCopy.headlineOutline}</span>
            <span className="landing-headline-line landing-headline-accent">{landingCopy.headlineAccent}</span>
          </h1>
          <p className="landing-hero-description">{landingCopy.description}</p>
          <div className="landing-hero-actions">
            <button type="button" onClick={() => onNavigate("/register")} className="landing-primary-button">
              {landingCopy.getStarted}<Arrow size={18} aria-hidden="true" />
            </button>
            <a href="#demo" className="landing-secondary-link">
              <span><Play size={14} fill="currentColor" aria-hidden="true" /></span>{landingCopy.watchDemo}
            </a>
          </div>
          <div className="landing-proof">
            <span>{landingCopy.proofTrial}</span>
            <span>{landingCopy.proofCard}</span>
            <span>{landingCopy.proofSetup}</span>
          </div>
        </Reveal>

        <Reveal delay={120} className="landing-hero-visual">
          <div className="landing-floor-plan">
            <div className="landing-floor-meta">
              <span>{landingCopy.floorPlan}</span>
              <span><i />{landingCopy.liveStatus}</span>
            </div>
            <div className="landing-floor-room" role="img" aria-label={landingCopy.floorPlanAlt}>
              <span className="landing-floor-zone landing-floor-zone-one">{landingCopy.floorZone}</span>
              <span className="landing-floor-table landing-floor-table-one">04</span>
              <span className="landing-floor-table landing-floor-table-two">06</span>
              <span className="landing-floor-table landing-floor-table-three is-active">08</span>
              <span className="landing-floor-table landing-floor-table-four">10</span>
              <span className="landing-floor-table landing-floor-table-five">12</span>
              <span className="landing-floor-route" aria-hidden="true" />
              <span className="landing-floor-scan"><QrCode size={28} strokeWidth={1.7} aria-hidden="true" /></span>
              <span className="landing-floor-pin" aria-hidden="true" />
            </div>
            <div className="landing-floor-legend">
              <span><i className="is-busy" />{landingCopy.floorBusy}</span>
              <span><i />{landingCopy.floorAvailable}</span>
              <b>{landingCopy.table}</b>
            </div>
            <div className="landing-service-ticket">
              <div className="landing-service-ticket-head">
                <span>{landingCopy.ticketLabel}</span>
                <span>{landingCopy.now}</span>
              </div>
              <strong>{landingCopy.table}</strong>
              <span>{landingCopy.orderItems}</span>
              <div><i />{landingCopy.ticketStatus}<b>{landingCopy.prepValue}</b></div>
            </div>
            <span className="landing-floor-coordinate landing-floor-coordinate-one" aria-hidden="true">31° 57′ N</span>
            <span className="landing-floor-coordinate landing-floor-coordinate-two" aria-hidden="true">DINNER / 08</span>
          </div>
        </Reveal>
      </div>
      <div className="landing-hero-bottom" aria-label="menuPilot">
        <div className="landing-marquee-track">
          {[0, 1].map((copy) => (
            <span className="landing-marquee-group" key={copy} aria-hidden={copy === 1}>
              <span>{landingCopy.digitalMenu}</span><i /><span>{landingCopy.liveOrders}</span><i /><span>{landingCopy.smartOperations}</span><i />
              <span className="landing-marquee-brand">menuPilot</span><i />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
