import { landingCopy } from "../landing-data";

export default function CrewTicket({ member, index, headStamp, teamStamp, lang }) {
  return (
    <article className={`lp-crew-ticket${member.head ? " is-head" : ""} is-offset-${index % 2}`} lang={lang}>
      <header className="lp-crew-ticket-head">
        <span>{landingCopy.team.stationLabel} {String(index + 1).padStart(2, "0")} / {member.station}</span>
        <span>{teamStamp}</span>
      </header>
      <div className="lp-crew-ticket-body">
        <div className="lp-crew-monogram" aria-hidden="true">{member.initials}</div>
        <div className="lp-crew-name">
          <h3>{member.name}</h3>
          <p>{member.role}</p>
        </div>
        {member.head && <span className="lp-crew-stamp">{headStamp}</span>}
      </div>
      <footer className="lp-crew-ticket-foot">
        <span>menuPilot</span><span>{String(index + 1).padStart(2, "0")} / 05</span>
      </footer>
    </article>
  );
}
