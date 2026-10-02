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

export const DEFAULT_TAGLINE = "اطلب من هاتفك مباشرة";

export const MENU_STYLE_OPTIONS = {
  layout: [
    { value: "compact", label: "بطاقات أفقية مدمجة", hint: "صورة صغيرة بجانب النص. أطباق أكثر في الشاشة، والأنسب للجوال." },
    { value: "photo", label: "صور كبيرة", hint: "صورة الطبق تتصدر البطاقة. للمطاعم التي تملك صوراً قوية." },
    { value: "grid", label: "شبكة بعمودين", hint: "طبقان في كل صف. للمقاهي والحلويات والمشروبات." },
    { value: "text", label: "قائمة نصية", hint: "كالمنيو المطبوع: الاسم والسعر بلا صور." },
  ],
  image_side: [
    { value: "start", label: "يمين البطاقة" },
    { value: "end", label: "يسار البطاقة" },
  ],
  header: [
    { value: "cover", label: "صورة غلاف", hint: "خلفية المنيو أو لون الهوية في رأس كبير." },
    { value: "solid", label: "شريط بلون الهوية", hint: "رأس أقصر بلون واحد، بلا صورة." },
    { value: "minimal", label: "بسيط", hint: "الشعار والاسم فقط على خلفية الصفحة." },
  ],
  logo_shape: [
    { value: "rounded", label: "مستدير" },
    { value: "circle", label: "دائري" },
    { value: "square", label: "مربع" },
  ],
  chips: [
    { value: "pill", label: "أزرار كبسولية" },
    { value: "underline", label: "خط سفلي" },
  ],
  price_color: [
    { value: "primary", label: "بلون الهوية" },
    { value: "text", label: "بلون النص" },
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
