/* ==========================================================================
   cartLine.js — one line of a guest's order: a dish, its chosen extras
   («الإضافات»), a note and a quantity. Shared by the table cart
   (CartContext) and the online-ordering page, so both build the same
   payload. Prices here are for display; the server prices every order
   from the menu (dish + current price of each chosen extra).
   ========================================================================== */

import { t } from "../../i18n";

const ids = (options = []) => options.map((o) => String(o.id));

/** Same dish + same extras + same note → same line (quantities add up). */
export const lineKey = (menuItemId, options = [], note = "") =>
  `${menuItemId}|${[...ids(options)].sort().join(",")}|${note.trim()}`;

/** Dish price plus the chosen extras. */
export const unitPrice = (price, options = []) =>
  (Number(price) || 0) + options.reduce((sum, o) => sum + (Number(o.price) || 0), 0);

/** A line as the order endpoints expect it: extras travel as their ids. */
export const toOrderItem = (line) => ({
  menuItemId: line.menuItemId,
  quantity: line.quantity,
  note: line.note || "",
  options: ids(line.options),
});

/** "جبنة إضافية، بطاطا" — the chosen extras' names, for screens and texts. */
export const optionsText = (options) =>
  (Array.isArray(options) ? options : []).map((o) => o?.name).filter(Boolean).join(t("، "));

/** "برجر (+ جبنة إضافية، بطاطا)" — a dish with its extras, for plain-text messages. */
export const withOptions = (item) => {
  const extras = optionsText(item?.options);
  return extras ? `${item.name} (+ ${extras})` : item?.name;
};
