import { t } from "../../i18n";
/* How the customer menu looks (restaurant_settings.menu_style, checked by
   App\Support\MenuStyle on the server). Shared by the menu and the
   branding page's live preview, so the preview is the real thing. */

// Same defaults as App\Support\MenuStyle::DEFAULTS: a two-column photo grid
// under a coloured band that holds the search.
export const MENU_STYLE_DEFAULTS = {
  layout: "grid",
  image_side: "start",
  header: "solid",
  logo_shape: "rounded",
  chips: "pill",
  price_color: "primary",
  show_images: true,
  show_descriptions: true,
  background_color: null, // null = the theme's background
  surface_color: "#FFFFFF",
  tagline: null, // null = the default line below the name
};

export const DEFAULT_TAGLINE = t("اطلب من هاتفك مباشرة");

export const MENU_STYLE_OPTIONS = {
  layout: [
    { value: "compact", label: t("بطاقات أفقية مدمجة"), hint: t("صورة صغيرة بجانب النص. أطباق أكثر في الشاشة، والأنسب للجوال.") },
    { value: "photo", label: t("صور كبيرة"), hint: t("صورة الطبق تتصدر البطاقة. للمطاعم التي تملك صوراً قوية.") },
    { value: "grid", label: t("شبكة بعمودين"), hint: t("طبقان في كل صف. للمقاهي والحلويات والمشروبات.") },
    { value: "text", label: t("قائمة نصية"), hint: t("كالمنيو المطبوع: الاسم والسعر بلا صور.") },
  ],
  image_side: [
    { value: "start", label: t("يمين البطاقة") },
    { value: "end", label: t("يسار البطاقة") },
  ],
  header: [
    { value: "cover", label: t("صورة غلاف"), hint: t("خلفية المنيو أو لون الهوية في رأس كبير.") },
    { value: "solid", label: t("شريط بلون الهوية"), hint: t("شريط بلون الهوية فيه البحث، بلا صورة.") },
    { value: "minimal", label: t("بسيط"), hint: t("الشعار والاسم فقط على خلفية الصفحة.") },
  ],
  logo_shape: [
    { value: "rounded", label: t("مستدير") },
    { value: "circle", label: t("دائري") },
    { value: "square", label: t("مربع") },
  ],
  chips: [
    { value: "pill", label: t("أزرار كبسولية") },
    { value: "underline", label: t("خط سفلي") },
  ],
  price_color: [
    { value: "primary", label: t("بلون الهوية") },
    { value: "text", label: t("بلون النص") },
  ],
};

export function resolveMenuStyle(branding) {
  const saved = branding?.menu_style || {};
  const style = { ...MENU_STYLE_DEFAULTS };
  for (const key of Object.keys(MENU_STYLE_DEFAULTS)) if (saved[key] !== undefined && saved[key] !== null) style[key] = saved[key];
  if (style.layout === "text") style.show_images = false;
  return style;
}

export const logoRadius = (shape) => (shape === "circle" ? "9999px" : shape === "square" ? "6px" : "16px");
export const cardRadius = (cardStyle) => (cardStyle === "square" ? "8px" : cardStyle === "soft" ? "14px" : "18px");

/* The coloured header band: the brand colour, deepened only as much as white
   text needs to stay readable (WCAG 4.5:1). Dark brand colours come through
   unchanged. Used by the menu and the branding preview, so they match. */
const channel = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const rgb = (hex) => { const n = String(hex || "").replace("#", ""); const full = n.length === 3 ? [...n].map((x) => x + x).join("") : n; const v = parseInt(full, 16); return Number.isNaN(v) || full.length !== 6 ? null : [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const toHex = (c) => `#${c.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")}`;

export function headerColor(hex, fallback = "#1F2D3D") {
  let color = rgb(hex);
  if (!color) return fallback;
  for (let i = 0; i < 20 && 1.05 / (luminance(color) + 0.05) < 4.5; i++) color = color.map((x) => x * 0.9);
  return toHex(color);
}

/** A soft tint of a colour (inactive category chips, placeholders). */
export const tint = (hex, alpha = "1f") => (rgb(hex) ? `${hex}${alpha}` : "rgb(0 0 0 / 0.06)");
