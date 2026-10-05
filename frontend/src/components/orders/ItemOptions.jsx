/* ==========================================================================
   ItemOptions.jsx — the paid extras a guest chose for a dish
   («+ جبنة إضافية، بطاطا»), under the dish name on every screen that lists
   order items: cart, order status, kitchen tickets, bills, owner orders,
   online orders. The line price already includes them, so no prices here.
   size="lg" is for the kitchen's wall screen, read from a distance.
   ========================================================================== */
import { optionsText } from "../menu/cartLine";
import { t } from "../../i18n";

export default function ItemOptions({ options, size = "md", className = "" }) {
  const text = optionsText(options);
  if (!text) return null;
  return (
    <p className={`font-bold text-copper-ink ${size === "lg" ? "text-base leading-7" : "text-xs leading-5"} ${className}`}>
      <span className="sr-only">{t("الإضافات:")} </span>
      <span aria-hidden="true">+ </span>{text}
    </p>
  );
}
