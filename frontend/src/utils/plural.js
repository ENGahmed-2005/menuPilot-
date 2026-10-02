/* Arabic counting, done right: «طلب واحد»، «طلبان»، «3 طلبات»، «11 طلبًا».
   Intl.PluralRules("ar") knows the six Arabic forms (zero, one, two, few,
   many, other); each form is a string where {n} is the number.

     countAr(3, { one: "طلب واحد", two: "طلبان", few: "{n} طلبات", other: "{n} طلب" }) → "3 طلبات"
*/
import { lang } from "../i18n";

const rules = new Intl.PluralRules("ar");
const enRules = new Intl.PluralRules("en");

// In English the same call uses the entry's `en` forms (one / other).
export function countAr(n, forms) {
  if (lang === "en" && forms.en) return (forms.en[enRules.select(n)] ?? forms.en.other).replace("{n}", n);
  const form = forms[rules.select(n)] ?? forms.other;
  return form.replace("{n}", n);
}

/* The forms the app uses most, so wording stays the same everywhere. */
export const AR = {
  orders: { zero: "لا طلبات", one: "طلب واحد", two: "طلبان", few: "{n} طلبات", many: "{n} طلبًا", other: "{n} طلب", en: { zero: "no orders", one: "1 order", other: "{n} orders" } },
  lateOrders: { zero: "لا طلبات متأخرة", one: "طلب متأخر", two: "طلبان متأخران", few: "{n} طلبات متأخرة", many: "{n} طلبًا متأخرًا", other: "{n} طلب متأخر", en: { zero: "no late orders", one: "1 late order", other: "{n} late orders" } },
  tables: { zero: "لا طاولات", one: "طاولة واحدة", two: "طاولتان", few: "{n} طاولات", many: "{n} طاولة", other: "{n} طاولة", en: { zero: "no tables", one: "1 table", other: "{n} tables" } },
  items: { zero: "لا عناصر", one: "عنصر واحد", two: "عنصران", few: "{n} عناصر", many: "{n} عنصرًا", other: "{n} عنصر", en: { zero: "no items", one: "1 item", other: "{n} items" } },
  features: { zero: "لا ميزات", one: "ميزة واحدة", two: "ميزتان", few: "{n} ميزات", many: "{n} ميزة", other: "{n} ميزة", en: { zero: "no features", one: "1 feature", other: "{n} features" } },
  dishes: { zero: "لا أصناف", one: "صنف واحد", two: "صنفان", few: "{n} أصناف", many: "{n} صنفًا", other: "{n} صنف", en: { zero: "no dishes", one: "1 dish", other: "{n} dishes" } },
  extraFeatures: { one: "ميزة إضافية", two: "ميزتين إضافيتين", few: "{n} ميزات إضافية", many: "{n} ميزة إضافية", other: "{n} ميزة إضافية", en: { one: "1 more feature", other: "{n} more features" } },
  tablesAskingWaiter: { one: "طاولة واحدة تطلب نادلًا الآن", two: "طاولتان تطلبان نادلًا الآن", few: "{n} طاولات تطلب نادلًا الآن", many: "{n} طاولة تطلب نادلًا الآن", other: "{n} طاولة تطلب نادلًا الآن", en: { one: "1 table is asking for a waiter now", other: "{n} tables are asking for a waiter now" } },
  tablesAskedBill: { one: "طاولة واحدة طلبت الفاتورة", two: "طاولتان طلبتا الفاتورة", few: "{n} طاولات طلبت الفاتورة", many: "{n} طاولة طلبت الفاتورة", other: "{n} طاولة طلبت الفاتورة", en: { one: "1 table asked for the bill", other: "{n} tables asked for the bill" } },
  minutes: { zero: "أقل من دقيقة", one: "دقيقة واحدة", two: "دقيقتان", few: "{n} دقائق", many: "{n} دقيقة", other: "{n} دقيقة", en: { zero: "less than a minute", one: "1 minute", other: "{n} minutes" } },
};
