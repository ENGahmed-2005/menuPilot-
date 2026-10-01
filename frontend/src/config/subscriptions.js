/* ==========================================================================
   subscriptions.js — two plans + paid add-ons (mirrors the backend's
   config/subscriptions.php; docs/SUBSCRIPTIONS.md).
   The server is the authority: it prices every payment and sends the gated
   features a restaurant can use right now in user.subscription.features
   (trial = all, staff get their owner's). This file is for display and for
   hiding pages a restaurant can't open.
   ========================================================================== */

const OPERATIONS = ["dashboard", "tables", "menu", "orders", "kitchen", "cashier", "waiter", "staff"];

export const SUBSCRIPTION_PLANS = {
  basic: {
    id: "basic",
    name: "الأساسية",
    price: 15,
    description: "كل ما يحتاجه مطعم صغير ليعمل بالكامل من المنيو والطاولات.",
    features: OPERATIONS,
    limits: { tables: 10, menuItems: 50, themes: 0 },
  },
  pro: {
    id: "pro",
    name: "الاحترافية",
    price: 29,
    description: "للمطاعم المتنامية: تقارير، وهوية منيو خاصة، وبلا حدود.",
    features: [...OPERATIONS, "reports", "order-history", "smart-alerts", "branding", "background", "full-colors", "theme-presets", "presets"],
    limits: { tables: Infinity, menuItems: Infinity, themes: 4 },
  },
};
export const PLAN_ORDER = ["basic", "pro"];
export const DEFAULT_PLAN = "pro";

export const SUBSCRIPTION_ADDONS = {
  delivery: {
    id: "delivery",
    name: "التوصيل والطلب أونلاين",
    description: "استقبل طلبات الاستلام والتوصيل من رابط ورمز QR خاص بمطعمك، مع مناطق ورسوم توصيل.",
    price: 15,
    plans: ["basic", "pro"],
    features: ["online_orders"],
  },
  brand_plus: {
    id: "brand_plus",
    name: "الهوية الكاملة",
    description: "خط مخصص للمنيو، وألوان لوحة تحكم مخصصة، وإخفاء شعار menuPilot.",
    price: 5,
    plans: ["pro"],
    features: ["custom-font", "remove-branding", "custom-theme"],
  },
};
export const ADDON_ORDER = ["delivery", "brand_plus"];

// Retired plans, as the server maps them.
const LEGACY_PLANS = { premium: { plan: "pro", addons: ["delivery", "brand_plus"] } };

// Features the server gates (User::hasFeature). For these its list wins.
const SERVER_GATED = new Set([
  ...SUBSCRIPTION_PLANS.pro.features.filter((f) => !SUBSCRIPTION_PLANS.basic.features.includes(f)),
  ...ADDON_ORDER.flatMap((id) => SUBSCRIPTION_ADDONS[id].features),
]);
["reports", "order-history", "smart-alerts"].forEach((f) => SERVER_GATED.delete(f)); // shown by plan only

/** Retired plan → current plan + add-ons; keeps known add-ons in catalogue order. */
export function normalizePlan(plan, addons = []) {
  const legacy = LEGACY_PLANS[plan];
  const all = legacy ? [...addons, ...legacy.addons] : addons;
  return { plan: legacy ? legacy.plan : plan, addons: ADDON_ORDER.filter((id) => all.includes(id)) };
}

export function getSubscriptionPlan(plan) {
  return SUBSCRIPTION_PLANS[normalizePlan(plan).plan] || SUBSCRIPTION_PLANS[DEFAULT_PLAN];
}

export function addonFits(addonId, plan) {
  return Boolean(SUBSCRIPTION_ADDONS[addonId]?.plans.includes(plan));
}

/** Add-ons the plan can take, from a list (used when switching plans). */
export function compatibleAddons(plan, addons = []) {
  return addons.filter((id) => addonFits(id, plan));
}

export function monthlyPrice(plan, addons = []) {
  return (SUBSCRIPTION_PLANS[plan]?.price || 0) + addons.reduce((sum, id) => sum + (SUBSCRIPTION_ADDONS[id]?.price || 0), 0);
}

/** The add-on that unlocks a feature, if a plan alone doesn't. */
export function addonForFeature(feature) {
  return ADDON_ORDER.find((id) => SUBSCRIPTION_ADDONS[id].features.includes(feature)) || null;
}

/** The restaurant's subscription as the UI needs it (works for owner and staff). */
export function subscriptionOf(user) {
  const sub = user?.subscription;
  const { plan, addons } = normalizePlan(sub?.plan ?? user?.plan ?? "basic", sub?.addons ?? user?.addons ?? []);
  const trial = sub ? sub.status === "TRIAL" : user?.plan === "trial" && Boolean(user?.trial_ends_at) && new Date(user.trial_ends_at) > new Date();
  return { plan, addons, trial, serverFeatures: Array.isArray(sub?.features) ? sub.features : null };
}

/** Can this user's restaurant use a feature? null/undefined feature = always. */
export function userHasFeature(user, feature) {
  if (!feature || user?.role === "admin") return true;
  const { plan, addons, trial, serverFeatures } = subscriptionOf(user);
  if (trial) return true;
  if (serverFeatures && SERVER_GATED.has(feature)) return serverFeatures.includes(feature);
  const fromAddons = compatibleAddons(plan, addons).flatMap((id) => SUBSCRIPTION_ADDONS[id].features);
  return getSubscriptionPlan(plan).features.includes(feature) || fromAddons.includes(feature);
}

/** Kept for callers that only know a plan id (no add-ons). */
export function hasPlanFeature(plan, feature) {
  return getSubscriptionPlan(plan).features.includes(feature);
}
