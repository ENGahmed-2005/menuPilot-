import { useEffect, useRef } from "react";

export default function LandingCursor() {
  const cursor = useRef(null);

  useEffect(() => {
    const root = document.querySelector(".landing-page");
    const finePointer = window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!root || !finePointer.matches) return undefined;

    root.classList.add("has-custom-cursor");
    const move = (event) => {
      cursor.current?.style.setProperty("--cursor-x", `${event.clientX}px`);
      cursor.current?.style.setProperty("--cursor-y", `${event.clientY}px`);
    };
    const hover = (event) => {
      if (event.target.closest("a, button, [data-cursor-hover], .landing-ticket")) root.classList.add("cursor-hover");
    };
    const leave = (event) => {
      if (!event.relatedTarget || !event.relatedTarget.closest("a, button, [data-cursor-hover], .landing-ticket")) {
        root.classList.remove("cursor-hover");
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerover", hover);
    root.addEventListener("pointerout", leave);

    return () => {
      window.removeEventListener("pointermove", move);
      root.removeEventListener("pointerover", hover);
      root.removeEventListener("pointerout", leave);
      root.classList.remove("has-custom-cursor", "cursor-hover");
    };
  }, []);

  return <span ref={cursor} className="landing-cursor" aria-hidden="true"><i /></span>;
}
