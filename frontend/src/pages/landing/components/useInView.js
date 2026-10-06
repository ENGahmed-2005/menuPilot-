/* useInView.js — true once the element has scrolled into view (then stays
   true). For the landing's one-shot effects: counters, the steps' line. */
import { useEffect, useState } from "react";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

export function useInView(ref, { threshold = 0.3 } = {}) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setSeen(true); observer.disconnect(); }
    }, { threshold });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, seen, threshold]);
  return seen;
}
