/* SectionHeading.jsx — the one header every landing section uses: a small
   accent label, the title and a line of explanation. `tone="light"` is for
   sections on the cream background; `center` for centred sections. */
import Reveal from "./Reveal";

export default function SectionHeading({ eyebrow, title, children, tone = "dark", center = false, className = "" }) {
  const light = tone === "light";
  return (
    <Reveal className={`max-w-2xl ${center ? "mx-auto text-center" : ""} ${className}`}>
      {eyebrow && <span className={`text-xs font-black tracking-[.12em] ${light ? "text-copper-ink" : "text-[#EEA122]"}`}>{eyebrow}</span>}
      <h2 className={`mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl ${light ? "text-navy-deep" : ""}`}>{title}</h2>
      {children && <p className={`mt-3 text-base leading-7 ${light ? "text-muted" : "text-paper/70"}`}>{children}</p>}
    </Reveal>
  );
}
