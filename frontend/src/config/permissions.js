import { t } from "../i18n";
/* ==========================================================================
   permissions.js — mirror of backend App\Support\Permissions (labels + role
   defaults). Used for the staff permission editor and as a fallback when an
   older API / the mock server doesn't send user.permissions. The backend
   list is authoritative; GET /api/permissions returns it.
   ========================================================================== */
export const PERMISSION_GROUPS = [
  { title: t("الطاولات والطلبات"), items: ["view_dashboard", "view_tables", "manage_tables", "view_orders", "manage_orders", "cancel_orders", "reassign_orders", "handle_assistance"] },
  { title: t("الفواتير والمدفوعات"), items: ["view_payments", "verify_payments", "record_payment", "adjust_bill", "close_session"] },
  { title: t("المنيو والتقارير"), items: ["view_menu", "manage_menu", "view_reports"] },
  { title: t("المحاسبة والتصدير"), items: ["export_reports", "export_invoices", "export_payments", "export_sales", "manage_accounting_settings", "manage_finance"] },
  { title: t("إدارة المطعم"), items: ["manage_staff", "manage_restaurant", "manage_branding", "manage_settings"] },
];

export const PERMISSION_LABELS = {
  view_dashboard: t("عرض لوحة التحكم"),
  view_tables: t("عرض الطاولات والجلسات"),
  manage_tables: t("إدارة الطاولات ورموز QR"),
  view_orders: t("عرض الطلبات"),
  manage_orders: t("تحديث حالة الطلبات (المطبخ)"),
  cancel_orders: t("إلغاء أصناف من الطلبات"),
  reassign_orders: t("نقل الأصناف بين الطاولات"),
  handle_assistance: t("التعامل مع طلبات النادل"),
  deliver_orders: t("توصيل الطلبات الخارجية"),
  dispatch_deliveries: t("توزيع طلبات التوصيل على السائقين"),
  view_menu: t("عرض المنيو"),
  manage_menu: t("إدارة المنيو"),
  view_payments: t("عرض الفواتير والمدفوعات"),
  verify_payments: t("تأكيد أو رفض المدفوعات"),
  record_payment: t("تسجيل الدفع"),
  adjust_bill: t("تعديل أسعار الفاتورة"),
  close_session: t("إغلاق جلسة الطاولة"),
  view_reports: t("عرض التقارير"),
  manage_staff: t("إدارة الموظفين"),
  manage_restaurant: t("تعديل بيانات المطعم"),
  manage_branding: t("الهوية والألوان"),
  manage_subscription: t("إدارة الاشتراك"),
  manage_settings: t("إعدادات المطعم"),
  export_reports: t("تصدير التقارير المحاسبية"),
  export_invoices: t("تصدير الفواتير"),
  export_payments: t("تصدير المدفوعات"),
  export_sales: t("تصدير المبيعات والأصناف"),
  manage_accounting_settings: t("إعدادات المحاسبة والحسابات"),
  manage_finance: t("الرواتب والمصاريف والأرباح"),
  manage_users: t("إدارة مستخدمي المنصة"),
  manage_admin: t("إدارة المنصة"),
};

const RESTAURANT = Object.keys(PERMISSION_LABELS).filter((p) => !["manage_users", "manage_admin"].includes(p));
export const ASSIGNABLE = RESTAURANT.filter((p) => p !== "manage_subscription");

// Mirrors App\Support\Permissions: admin = platform only; a manager starts
// read-only and the owner grants management permissions explicitly.
export const MANAGER_DEFAULTS = ["view_dashboard", "view_tables", "view_orders", "view_menu", "view_payments", "view_reports"];
export const ROLE_DEFAULTS = {
  admin: ["manage_users", "manage_admin"],
  owner: RESTAURANT,
  manager: MANAGER_DEFAULTS,
  cashier: ["view_dashboard", "view_tables", "view_orders", "view_menu", "view_payments", "verify_payments", "record_payment", "adjust_bill", "close_session", "cancel_orders", "reassign_orders", "handle_assistance"],
  waiter: ["view_tables", "view_orders", "view_menu", "cancel_orders", "reassign_orders", "handle_assistance"],
  kitchen: ["view_orders", "manage_orders", "view_menu"],
  delivery: ["deliver_orders"],
  delivery_manager: ["dispatch_deliveries", "deliver_orders"],
};

export const ROLE_LABELS = { delivery_manager: t("مسؤول التوصيل"), delivery: t("سائق توصيل"), owner: t("صاحب المطعم"), manager: t("مدير"), cashier: t("كاشير"), waiter: t("نادل"), kitchen: t("مطبخ"), admin: t("إدارة المنصة") };
