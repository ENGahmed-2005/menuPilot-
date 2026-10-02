import { t } from "../i18n";
/* ==========================================================================
   format.js — one way to print money, tables and order numbers.
   Western digits everywhere (prices, timers and counters used to mix
   "٢٤٫٥" and "24.5" on the same screen).
   ========================================================================== */
const moneyFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export const money = (value) => `${moneyFormat.format(Number(value || 0))} ₪`;

/** "5" → "طاولة 5"; labels that already say "Table 5" / "طاولة 5" stay as-is. */
export const tableName = (label) => {
  const text = String(label ?? "").trim();
  if (!text) return t("طاولة");
  return /^(table|طاولة)\b/i.test(text) ? text : t("طاولة {0}", { 0: text });
};

/** 12 → "#12"; already-formatted references ("ORD-5001") are left alone. */
export const orderNo = (value) => {
  const text = String(value ?? "").trim();
  return /^\d+$/.test(text) ? `#${text}` : text || "—";
};
