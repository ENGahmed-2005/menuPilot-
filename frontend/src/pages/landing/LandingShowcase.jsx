import { useRef, useState } from "react";
import { lang } from "../../i18n";
import { landingCopy } from "./landing-data";

export default function LandingShowcase() {
  const initialTab = landingCopy.showcase.tabs[0]?.id ?? "menu";
  const [active, setActive] = useState(initialTab);
  const tabRefs = useRef([]);
  const selected = landingCopy.showcase.tabs.find((tab) => tab.id === active) ?? landingCopy.showcase.tabs[0];

  function moveTab(event, index) {
    const forwardKey = document.documentElement.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
    const backwardKey = document.documentElement.dir === "rtl" ? "ArrowRight" : "ArrowLeft";
    let nextIndex = index;
    if (event.key === forwardKey) nextIndex = (index + 1) % landingCopy.showcase.tabs.length;
    else if (event.key === backwardKey) nextIndex = (index - 1 + landingCopy.showcase.tabs.length) % landingCopy.showcase.tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = landingCopy.showcase.tabs.length - 1;
    else return;
    event.preventDefault();
    const nextTab = landingCopy.showcase.tabs[nextIndex];
    setActive(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <section id="platform" className="lp-section lp-showcase" aria-labelledby="lp-showcase-title">
      <div className="lp-container">
        <div className="lp-showcase-heading">
          <div>
            <p className="lp-eyebrow">{landingCopy.showcase.eyebrow}</p>
            <h2 id="lp-showcase-title" className="lp-section-title">{landingCopy.showcase.title}</h2>
          </div>
          <p>{landingCopy.showcase.description}</p>
        </div>
        <div className="lp-showcase-tabs" role="tablist" aria-label={landingCopy.showcase.eyebrow}>
          {landingCopy.showcase.tabs.map((tab, index) => (
            <button
              type="button"
              role="tab"
              id={`lp-tab-${tab.id}`}
              aria-selected={active === tab.id}
              aria-controls="lp-showcase-panel"
              tabIndex={active === tab.id ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => moveTab(event, index)}
              ref={(element) => { tabRefs.current[index] = element; }}
              key={tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div id="lp-showcase-panel" className="lp-showcase-panel" role="tabpanel" aria-labelledby={`lp-tab-${selected.id}`}>
          <figure className={`lp-product-frame lp-shot-frame lp-shot-${selected.id}`} key={active}>
            <img
              src={`/landing/${lang}-${selected.image}.webp`}
              alt={selected.alt}
              width="1600"
              height="1000"
              loading="lazy"
            />
          </figure>
        </div>
        <p className="lp-showcase-caption">{selected.description}</p>
        <div className="lp-capability-list">
          {landingCopy.showcase.capabilities.map((capability) => <span key={capability}>{capability}</span>)}
        </div>
      </div>
    </section>
  );
}
