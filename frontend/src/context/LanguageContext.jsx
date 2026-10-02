/* ==========================================================================
   LanguageContext.jsx — the app's language for components that want it via
   a hook. The language itself lives in i18n/index.js (from ?lang= or the
   saved choice); switching reloads the page so every label is translated.
   ========================================================================== */
import { createContext, useContext } from "react";
import { dir, lang, setLang } from "../i18n";

const value = { lang, dir, setLang, toggleLang: () => setLang(lang === "en" ? "ar" : "en") };
const LanguageContext = createContext(value);

export function LanguageProvider({ children }) {
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/** const { lang, dir, toggleLang } = useLanguage(); */
export function useLanguage() {
  return useContext(LanguageContext);
}
