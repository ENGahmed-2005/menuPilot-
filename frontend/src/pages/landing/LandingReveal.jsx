import { useReveal } from "../../hooks/useReveal";

export default function LandingReveal({ children, className = "", as: Element = "div" }) {
  const [ref, visible] = useReveal();
  return (
    <Element ref={ref} className={`lp-reveal${visible ? " is-visible" : ""} ${className}`}>
      {children}
    </Element>
  );
}
