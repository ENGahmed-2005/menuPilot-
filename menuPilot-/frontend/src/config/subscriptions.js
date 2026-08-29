export const SUBSCRIPTION_PLANS = {
  basic: {
    id: "basic",
    name: "الأساسية",
    price: 19,
    description: "للمطاعم الصغيرة التي تبدأ رحلتها.",
    features: ["dashboard", "tables", "menu", "orders"],
    theme: "none",
    limits: { tables: 10, menuItems: 50, themes: 0 },
  },
  pro: {
    id: "pro",
    name: "الاحترافية",
    price: 39,
    description: "للمطاعم المتنامية التي تحتاج تحكمًا أكبر.",
    features: ["dashboard", "tables", "menu", "orders", "reports", "kitchen", "cashier", "waiter", "theme-presets"],
    theme: "presets",
    limits: { tables: 50, menuItems: 250, themes: 4 },
  },
  premium: {
    id: "premium",
    name: "المميزة",
    price: 69,
    description: "للمطاعم التي تريد التجربة الكاملة.",
    features: ["dashboard", "tables", "menu", "orders", "reports", "kitchen", "cashier", "waiter", "advanced-reports", "analytics", "priority-support", "theme-presets", "custom-theme"],
    theme: "custom",
    limits: { tables: Infinity, menuItems: Infinity, themes: Infinity },
  },
};

export const DEFAULT_PLAN = "pro";

export function getSubscriptionPlan(plan) {
  return SUBSCRIPTION_PLANS[plan] || SUBSCRIPTION_PLANS[DEFAULT_PLAN];
}

export function hasPlanFeature(plan, feature) {
  return getSubscriptionPlan(plan).features.includes(feature);
}
