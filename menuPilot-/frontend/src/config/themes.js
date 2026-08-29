/* ==========================================================================
   themes.js — الثيمات الجاهزة لتخصيص لوحة تحكم المطعم، ودالة تحويل أي ثيم
   (جاهز أو مخصّص) إلى قيم CSS Variables فعلية تُطبَّق على DashboardShell.
   --------------------------------------------------------------------------
   ليه الملف ده منفصل عن ThemeCustomization.jsx؟ عشان DashboardShell.jsx
   محتاج نفس بيانات PRESETS برضه (عشان يطبّق الثيم المحفوظ فعليًا)، فلو
   سبناها جوّا الصفحة كان هيتكرر الاستيراد بشكل دائري أو ناقص.
   ========================================================================== */

export const THEME_PRESETS = [
  { id: "menuPilot", name: "هوية menuPilot", primary: "#B8793E", secondary: "#5B7A52", background: "#F7F3E9" },
  { id: "forest", name: "Forest", primary: "#789262", secondary: "#C58B62", background: "#F5F1E7" },
  { id: "terracotta", name: "Terracotta", primary: "#C86B43", secondary: "#465A45", background: "#FAF3E7" },
  { id: "plum", name: "Plum", primary: "#9A6485", secondary: "#596B53", background: "#F7F0EA" },
];

export function getThemePreset(id) {
  return THEME_PRESETS.find((p) => p.id === id) || THEME_PRESETS[0];
}

/** يغمّق لون hex بنسبة معيّنة (0..1) — نستخدمه لتوليد نسخة "-deep" من اللون
 *  الأساسي المختار (زي copper-deep) بدل ما نطلب من المستخدم لونين لكل حالة. */
function darken(hex, amount = 0.16) {
  const n = hex.replace("#", "");
  const r = Math.max(0, Math.round(parseInt(n.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(n.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(n.slice(4, 6), 16) * (1 - amount)));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * يحوّل قيمة user.theme (من mockServer) إلى كائن CSS variable overrides
 * جاهز للتطبيق كـ inline style على DashboardShell. يرجّع null لو مفيش ثيم
 * محفوظ (يعني استخدم الهوية الافتراضية من index.css بدون أي override).
 *
 * @param {{preset:string, colors?:{primary,secondary,background}}|null} theme
 */
export function resolveThemeVars(theme) {
  if (!theme) return null;

  const colors =
    theme.preset === "custom" && theme.colors
      ? theme.colors
      : getThemePreset(theme.preset);

  if (!colors?.primary) return null;

  return {
    "--color-copper": colors.primary,
    "--color-copper-deep": darken(colors.primary),
    "--color-herb": colors.secondary,
    "--color-paper-2": colors.background,
    "--color-paper": colors.background,
  };
}
