import { SUBSCRIPTION_ADDONS, SUBSCRIPTION_PLANS } from "../../config/subscriptions";
import { landingCopy } from "./landing-data";
import Receipt from "./components/Receipt";

export default function LandingPricing() {
  return (
    <section id="pricing" className="lp-section lp-pricing" aria-labelledby="lp-pricing-title">
      <div className="lp-container">
        <div className="lp-pricing-heading">
          <div>
            <p className="lp-eyebrow">{landingCopy.pricing.eyebrow}</p>
            <h2 id="lp-pricing-title" className="lp-section-title">{landingCopy.pricing.title}</h2>
          </div>
          <p>{landingCopy.pricing.description}</p>
        </div>
        <div className="lp-plan-grid">
          {landingCopy.pricing.plans.map(({ id }) => {
            const plan = SUBSCRIPTION_PLANS[id];
            const isFeatured = id === "pro";
            const tableCount = plan.limits.tables === Infinity
              ? landingCopy.pricing.unlimited
              : plan.limits.tables === 0
                ? landingCopy.pricing.noTables
                : landingCopy.pricing.upTo.replace("{0}", plan.limits.tables);
            const itemCount = plan.limits.menuItems === Infinity
              ? landingCopy.pricing.unlimited
              : landingCopy.pricing.upTo.replace("{0}", plan.limits.menuItems);
            const lines = [
              { label: landingCopy.pricing.tableLine, value: tableCount },
              { label: landingCopy.pricing.menuLine, value: itemCount },
              { label: landingCopy.pricing.serviceLine, value: landingCopy.pricing.serviceValues[id] },
              { label: landingCopy.pricing.supportLine, value: landingCopy.pricing.supportValues[id] },
            ];
            return (
              <Receipt
                key={id}
                plan={id}
                planLabel={plan.name}
                price={plan.price}
                description={plan.description}
                lines={[
                  ...lines,
                  ...landingCopy.pricing.included[id].map((feature, index) => ({
                    label: index === 0 ? `${landingCopy.pricing.includesLabel} · ${feature}` : feature,
                    value: "",
                  })),
                ]}
                thankYou={landingCopy.pricing.thankYou}
                mostOrdered={landingCopy.pricing.mostPopular}
                start={landingCopy.pricing.start}
                perMonth={landingCopy.pricing.perMonth}
                featured={isFeatured}
              />
            );
          })}
        </div>
        <div className="lp-addon-options" aria-label={landingCopy.pricing.addOnsLabel}>
          <p>{landingCopy.pricing.addOnsLabel}</p>
          {landingCopy.pricing.addOns.map(({ id, name }) => {
            const addon = SUBSCRIPTION_ADDONS[id];
            return (
              <div className="lp-addon-option" key={id}>
                <span>{name}</span>
                <b className="num">${addon.price} <small>/ {landingCopy.pricing.perMonth}</small></b>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
