import LandingReveal from "./LandingReveal";
import { landingCopy } from "./landing-data";
import Ticket from "./components/Ticket";
import { lang } from "../../i18n";

export default function LandingStatement() {
  const words = `${landingCopy.statement.lead} ${landingCopy.statement.accent}`.split(/\s+/);
  return (
    <section id="rush" className="lp-statement" aria-labelledby="lp-statement-title">
      <LandingReveal className="lp-container lp-statement-inner">
        <h2 id="lp-statement-title">
          {words.map((word, index) => (
            <span className="lp-statement-word" style={{ "--word-index": index }} key={`${word}-${index}`}>{word} </span>
          ))}
        </h2>
        <p className="lp-statement-note">{landingCopy.statement.description}</p>
      </LandingReveal>
      <div className="lp-marquee" aria-hidden="true">
        <div className="lp-marquee-track">
          {Array.from({ length: 8 }, (_, row) => (
            <Ticket
              key={row}
              table={String((row % 4) + 1).padStart(2, "0")}
              time={`20:${String(41 + (row % 4)).padStart(2, "0")}`}
              lines={[{ name: landingCopy.statement.marqueeOrder, quantity: "x1" }]}
              status={{ label: landingCopy.statement.marqueeStatus, state: "received" }}
              lang={lang}
              className="lp-ticket-marquee"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
