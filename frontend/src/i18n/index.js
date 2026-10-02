/* ==========================================================================
   i18n — Arabic (default) and English.
   --------------------------------------------------------------------------
   t("النص العربي") returns the English text from en.js when the language is
   English, and the Arabic text otherwise; a missing translation simply shows
   the Arabic. Placeholders: t("منذ {0} د", { 0: minutes }).
   The language comes from ?lang=en|ar in the link (then remembered), or the
   saved choice, else Arabic. Switching reloads the page, so text defined
   outside components (status labels, menus) is translated too.
   ========================================================================== */
import en from "./en.js";

const KEY = "menupilot.lang";

function pick() {
  try {
    const q = new URLSearchParams(window.location.search).get("lang");
    if (q === "en" || q === "ar") { localStorage.setItem(KEY, q); return q; }
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "ar") return saved;
  } catch { /* private mode */ }
  return "ar";
}

export const lang = typeof window === "undefined" ? "ar" : pick();
export const dir = lang === "ar" ? "rtl" : "ltr";
/** For dates and numbers: Western digits in both languages. */
export const locale = lang === "ar" ? "ar-PS-u-nu-latn" : "en-GB";

const dict = lang === "en" ? en : null;
const missing = new Set();

export function t(text, vars) {
  let out = text;
  if (dict) {
    out = dict[text];
    if (out === undefined) { out = text; missing.add(text); }
  }
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return out;
}

export function setLang(next) {
  try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
  const url = new URL(window.location.href);
  url.searchParams.delete("lang");
  window.location.replace(url.toString());
}

if (typeof document !== "undefined") {
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
}
// In development, window.__missingTranslations lists Arabic text without English.
if (typeof window !== "undefined" && import.meta.env?.DEV) window.__missingTranslations = missing;
