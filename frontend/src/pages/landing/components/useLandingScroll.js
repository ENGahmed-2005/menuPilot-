import { useEffect, useState } from "react";

export default function useLandingScroll(rootRef, chapterIds) {
  const [active, setActive] = useState(chapterIds[0]);
  useEffect(() => {
    const root = rootRef.current;
    const sections = chapterIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reveals = [...root.querySelectorAll("[data-mp-reveal]")];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove("mp-reveal-pending");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    function applyMotion() {
      reveals.forEach((el) => {
        if (motion.matches) {
          el.classList.remove("mp-reveal-pending");
          observer.unobserve(el);
        } else if (el.getBoundingClientRect().top > innerHeight) {
          el.classList.add("mp-reveal-pending");
          observer.observe(el);
        }
      });
    }
    let frame = 0;
    function update() {
      frame = 0;
      const end = document.documentElement.scrollHeight - innerHeight;
      root.style.setProperty(
        "--mp-progress",
        String(end > 0 ? Math.min(1, Math.max(0, scrollY / end)) : 1),
      );
      let current = sections[0]?.id;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= innerHeight * 0.45)
          current = section.id;
      }
      if (current) setActive(current);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    applyMotion();
    // React mounts after the browser's initial hash lookup.
    const initialSection = document.getElementById(window.location.hash.slice(1));
    if (initialSection && root.contains(initialSection)) {
      initialSection.scrollIntoView({ behavior: "instant", block: "start" });
    }
    update();
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    motion.addEventListener("change", applyMotion);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      motion.removeEventListener("change", applyMotion);
      reveals.forEach((el) => el.classList.remove("mp-reveal-pending"));
    };
  }, [rootRef, chapterIds]);
  return active;
}
