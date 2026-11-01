import { landingCopy } from "../landing-data";

export default function Ticket({
  table,
  time,
  lines,
  stamp,
  status,
  total,
  lang,
  variant = "default",
  className = "",
  compact = false,
}) {
  const { tableLabel, orderLabel, totalLabel } = landingCopy.ticket;

  return (
    <article className={`lp-ticket lp-ticket-${variant}${compact ? " is-compact" : ""} ${className}`} lang={lang} aria-label={`${tableLabel} ${table}`}>
      <header className="lp-ticket-head">
        <div>
          <strong>menuPilot</strong>
          <span>{orderLabel}</span>
        </div>
        {stamp && <span className="lp-ticket-stamp">{stamp}</span>}
      </header>
      <div className="lp-ticket-meta">
        <strong>{tableLabel} {table}</strong>
        <time>{time}</time>
      </div>
      <div className="lp-ticket-divider" aria-hidden="true" />
      <ul className="lp-ticket-lines">
        {lines.map((line) => (
          <li key={`${line.name}-${line.quantity}`}>
            <span className="lp-ticket-item">{line.name}</span>
            <span className="lp-ticket-quantity">{typeof line.quantity === "number" ? `x${line.quantity}` : line.quantity}</span>
            {(line.price || line.unitPrice) && <span className="lp-ticket-price">{line.price ?? line.unitPrice * line.quantity}</span>}
          </li>
        ))}
      </ul>
      {total && (
        <>
          <div className="lp-ticket-divider" aria-hidden="true" />
          <div className="lp-ticket-total"><strong>{totalLabel}</strong><b>{total}</b></div>
        </>
      )}
      {status?.label && (
        <footer className="lp-ticket-status" aria-live="polite">
          <span className={`lp-ticket-status-dot${status?.state ? ` is-${status.state}` : ""}`} aria-hidden="true" />
          <span>{status.label}</span>
        </footer>
      )}
    </article>
  );
}
