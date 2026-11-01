import { landingCopy } from "./landing-data";
import { lang } from "../../i18n";
import CrewTicket from "./components/CrewTicket";

export default function LandingTeam() {
  return (
    <section id="team" className="lp-team lp-section" aria-labelledby="lp-team-title">
      <div className="lp-container">
        <header className="lp-team-intro">
          <p className="lp-eyebrow">{landingCopy.team.eyebrow}</p>
          <h2 id="lp-team-title" className="lp-section-title">{landingCopy.team.title}</h2>
          <p className="lp-team-description">{landingCopy.team.description}</p>
        </header>
        <div className="lp-crew-rail" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <ol className="lp-crew-list">
          {landingCopy.team.members.map((member, index) => (
            <li key={member.name}>
              <CrewTicket
                member={member}
                index={index}
                headStamp={landingCopy.team.headStamp}
                teamStamp={landingCopy.team.teamStamp}
                lang={lang}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
