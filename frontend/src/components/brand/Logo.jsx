/* ==========================================================================
   Logo.jsx — the only way to show the menuPilot logo.
   --------------------------------------------------------------------------
   Replaces the 400 KB SVG (a wrapped PNG) and the cream "pill" that was
   needed because the dark "menu" wordmark disappeared on dark backgrounds.
   Assets in /public/brand are ~25 KB WebP with a PNG fallback.

   layout: "horizontal" (default — bars, sidebars) | "stacked" (hero,
           loading) | "mark" (icon only — compact spaces)
   on:     "light" (default) | "dark" — picks the wordmark colour that
           reads on that background, so no backing pill is needed.
   height: rendered height in px (width follows the aspect ratio).
   ========================================================================== */
const SOURCES = {
  horizontal: { light: "logo", dark: "logo-on-dark", ratio: 3.44 },
  stacked: { light: "logo-stacked", dark: "logo-stacked-on-dark", ratio: 1.2 },
  mark: { light: "mark", dark: "mark", ratio: 1.21 },
};

export default function Logo({ layout = "horizontal", on = "light", height = 36, className = "", alt = "menuPilot", priority = false }) {
  const source = SOURCES[layout] || SOURCES.horizontal;
  const file = source[on === "dark" ? "dark" : "light"];
  const width = Math.round(height * source.ratio);
  return (
    <picture className={`inline-flex shrink-0 ${className}`}>
      <source srcSet={`/brand/${file}.webp`} type="image/webp" />
      <img
        src={`/brand/${file}.png`}
        alt={alt}
        width={width}
        height={height}
        style={{ height, width: "auto" }}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable="false"
        className="select-none object-contain"
      />
    </picture>
  );
}
