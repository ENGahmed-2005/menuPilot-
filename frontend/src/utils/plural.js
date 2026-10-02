/* Arabic counting, done right: «طلب واحد»، «طلبان»، «3 طلبات»، «11 طلبًا».
   Intl.PluralRules("ar") knows the six Arabic forms (zero, one, two, few,
   many, other); each form is a string where {n} is the number.

     countAr(3, { one: "طلب واحد", two: "طلبان", few: "{n} طلبات", other: "{n} طلب" }) → "3 طلبات"
*/
const rules = new Intl.PluralRules("ar");

export function countAr(n, forms) {
  const form = forms[rules.select(n)] ?? forms.other;
  return form.replace("{n}", n);
}

/* The forms the app uses most, so wording stays the same everywhere. */
export const AR = {
  orders: { zero: "لا طلبات", one: "طلب واحد", two: "طلبان", few: "{n} طلبات", many: "{n} طلبًا", other: "{n} طلب" },
  lateOrders: { zero: "لا طلبات متأخرة", one: "طلب متأخر", two: "طلبان متأخران", few: "{n} طلبات متأخرة", many: "{n} طلبًا متأخرًا", other: "{n} طلب متأخر" },
  tables: { zero: "لا طاولات", one: "طاولة واحدة", two: "طاولتان", few: "{n} طاولات", many: "{n} طاولة", other: "{n} طاولة" },
  items: { zero: "لا عناصر", one: "عنصر واحد", two: "عنصران", few: "{n} عناصر", many: "{n} عنصرًا", other: "{n} عنصر" },
  features: { zero: "لا ميزات", one: "ميزة واحدة", two: "ميزتان", few: "{n} ميزات", many: "{n} ميزة", other: "{n} ميزة" },
  dishes: { zero: "لا أصناف", one: "صنف واحد", two: "صنفان", few: "{n} أصناف", many: "{n} صنفًا", other: "{n} صنف" },
  extraFeatures: { one: "ميزة إضافية", two: "ميزتين إضافيتين", few: "{n} ميزات إضافية", many: "{n} ميزة إضافية", other: "{n} ميزة إضافية" },
  tablesAskingWaiter: { one: "طاولة واحدة تطلب نادلًا الآن", two: "طاولتان تطلبان نادلًا الآن", few: "{n} طاولات تطلب نادلًا الآن", many: "{n} طاولة تطلب نادلًا الآن", other: "{n} طاولة تطلب نادلًا الآن" },
  tablesAskedBill: { one: "طاولة واحدة طلبت الفاتورة", two: "طاولتان طلبتا الفاتورة", few: "{n} طاولات طلبت الفاتورة", many: "{n} طاولة طلبت الفاتورة", other: "{n} طاولة طلبت الفاتورة" },
  minutes: { zero: "أقل من دقيقة", one: "دقيقة واحدة", two: "دقيقتان", few: "{n} دقائق", many: "{n} دقيقة", other: "{n} دقيقة" },
};
