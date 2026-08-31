/* ==========================================================================
   formatCurrency.js — تنسيق موحّد للمبالغ المالية عبر التطبيق
   (الفواتير FR-29، تعديلات الكاشير FR-36، تقارير المبيعات FR-40...)
   ========================================================================== */
export function formatCurrency(amount, currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}
