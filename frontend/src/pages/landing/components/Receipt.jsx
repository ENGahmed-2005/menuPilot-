import { Link } from "react-router-dom";

export default function Receipt({
  plan,
  planLabel,
  price,
  description,
  lines,
  thankYou,
  mostOrdered,
  start,
  perMonth,
  featured = false,
}) {
  return (
    <article className={`lp-receipt${featured ? " is-featured" : ""}`}>
      {featured && <span className="lp-receipt-stamp">{mostOrdered}</span>}
      <header className="lp-receipt-header">
        <span>menuPilot / {planLabel}</span>
        <small>{perMonth}</small>
      </header>
      <p className="lp-receipt-price"><strong>${price}</strong><span> / {perMonth}</span></p>
      <p className="lp-receipt-description">{description}</p>
      <div className="lp-receipt-divider" aria-hidden="true" />
      <ul className="lp-receipt-lines">
        {lines.map(({ label, value }) => (
          <li className={value ? "" : "is-feature"} key={label}>
            <span>{label}</span>{value && <><i aria-hidden="true" /><b>{value}</b></>}
          </li>
        ))}
      </ul>
      <div className="lp-receipt-divider" aria-hidden="true" />
      <p className="lp-receipt-thanks">{thankYou}</p>
      <Link to={`/register?plan=${plan}`} className="lp-receipt-link">{start}</Link>
    </article>
  );
}
