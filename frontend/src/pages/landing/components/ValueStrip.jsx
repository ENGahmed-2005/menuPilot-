import { useEffect, useRef, useState } from "react";
import { landingCopy } from "./landingCopy";

export default function ValueStrip() {
  const ref = useRef(null);
  const [counts, setCounts] = useState(() => landingCopy.stats.map(() => 0));

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const targets = landingCopy.stats.map(({ amount }) => amount);
    let frame;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setCounts(targets);
        return;
      }

      const startedAt = performance.now();
      const animate = (now) => {
        const progress = Math.min((now - startedAt) / 1100, 1);
        const eased = 1 - (1 - progress) ** 3;
        setCounts(targets.map((target) => Math.round(target * eased)));
        if (progress < 1) frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    }, { threshold: 0.35 });

    observer.observe(element);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className="landing-value-strip">
      <div ref={ref} className="landing-value-strip-inner">
        {landingCopy.stats.map((item, index) => (
          <div key={item.title} className="landing-value-item" aria-label={`${item.amount}${item.suffix} ${item.title}`}>
            <span className="landing-value-number" aria-hidden="true">{counts[index]}{item.suffix}</span>
            <span className="landing-value-title">{item.title}</span>
            <span className="landing-value-subtitle">{item.caption}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
