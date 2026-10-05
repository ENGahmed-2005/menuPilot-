/* ==========================================================================
   menuOptions.js — a dish's extras («الإضافات») in the owner's form.
   The API shape is [{ id, name, price }]; the form edits rows with a local
   key and the price as text (so the field can be cleared). Rows that came
   from the server keep their id on save, so orders that already reference an
   extra stay meaningful; new rows go without one and the server assigns it.
   ========================================================================== */
import { countAr } from "../../utils/plural";

export const MAX_OPTIONS = 20;
export const MAX_OPTION_NAME = 60;
export const MAX_OPTION_PRICE = 9999.99;

let lastKey = 0;

export const newOptionRow = (option = {}) => ({
  key: `option-${++lastKey}`,
  id: option.id,
  name: option.name ?? "",
  price: option.price == null ? "" : String(option.price),
});

/** The dish's options from the API → editable rows. */
export const optionRows = (options = []) => options.map(newOptionRow);

/** Editable rows → the "options" of the create/update payload. */
export const optionsPayload = (rows) =>
  rows.map(({ id, name, price }) => ({ ...(id ? { id } : {}), name: name.trim(), price: Number(price) }));

/** Same rule as the server: 0 to 9999.99, at most two decimals. */
export function validOptionPrice(value) {
  const n = Number(value);
  return String(value).trim() !== "" && Number.isFinite(n) && n >= 0 && n <= MAX_OPTION_PRICE && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
}

/**
 * Rows a 422 rejected, by row key: { [key]: { name?: true, price?: true } },
 * or null. Laravel names the fields options.N.name / options.N.price, where
 * N is the row's position in what was sent.
 */
export function optionErrorFlags(sentRows, error) {
  const flags = {};
  for (const field of Object.keys(error?.errors || {})) {
    const [, index, part] = /^options\.(\d+)\.(name|price)$/.exec(field) || [];
    const key = index && sentRows[Number(index)]?.key;
    if (key) flags[key] = { ...flags[key], [part]: true };
  }
  return Object.keys(flags).length ? flags : null;
}

/** Marks the flagged rows; the mark clears when the owner edits that field. */
export const flagRows = (rows, flags) =>
  rows.map((row) => (flags[row.key] ? { ...row, serverError: flags[row.key] } : row));

// «إضافة واحدة»، «إضافتان»، «3 إضافات»، «11 إضافة» — for the menu list.
const EXTRAS = { one: "إضافة واحدة", two: "إضافتان", few: "{n} إضافات", many: "{n} إضافة", other: "{n} إضافة", en: { one: "1 add-on", other: "{n} add-ons" } };
export const extrasCount = (n) => countAr(n, EXTRAS);
