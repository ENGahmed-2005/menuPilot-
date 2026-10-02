import { t } from "../../i18n";
/* How the customer menu looks (restaurant_settings.menu_style, checked by
   App\Support\MenuStyle on the server). Shared by the menu and the
   branding page's live preview, so the preview is the real thing. */

export const MENU_STYLE_DEFAULTS = {
  layout: "compact",
  image_side: "start",
  header: "cover",
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
    { value: "solid", label: t("شريط بلون الهوية"), hint: t("رأس أقصر بلون واحد، بلا صورة.") },
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
