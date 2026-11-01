import { BookOpen, ChefHat, ClipboardList, Store } from "lucide-react";
import { landingCopy } from "./landing-data";

const icons = [ClipboardList, BookOpen, ChefHat, Store];

export default function LandingTrust() {
  return (
    <section className="lp-trust" aria-label={landingCopy.trust.label}>
      <div className="lp-container lp-trust-inner">
        <p>{landingCopy.trust.label}</p>
        <ul>
          {landingCopy.trust.items.map((item, index) => {
            const Icon = icons[index];
            return (
              <li key={item}>
                <Icon size={17} strokeWidth={1.6} aria-hidden="true" />
                <span>{item}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
