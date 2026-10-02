/* Switches between Arabic and English (reloads the page; see i18n/index.js). */
import { Languages } from "lucide-react";
import { lang, setLang } from "../../i18n";

export default function LanguageSwitch({ className = "", tone = "light" }) {
  const next = lang === "en" ? "ar" : "en";
  const look = tone === "dark"
    ? "border-white/20 text-white hover:bg-white/10"
    : "border-ink/15 text-ink hover:bg-ink/5";
  return (
    <button type="button" onClick={() => setLang(next)} lang={next}
      aria-label={next === "en" ? "Switch to English" : "التبديل إلى العربية"}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-bold transition-colors ${look} ${className}`}>
      <Languages size={15} aria-hidden="true" />
      {next === "en" ? "English" : "العربية"}
    </button>
  );
}
