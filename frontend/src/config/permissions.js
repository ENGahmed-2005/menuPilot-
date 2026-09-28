/* ==========================================================================
   permissions.js — mirror of backend App\Support\Permissions (labels + role
   defaults). Used for the staff permission editor and as a fallback when an
   older API / the mock server doesn't send user.permissions. The backend
   list is authoritative; GET /api/permissions returns it.
   ========================================================================== */
export const PERMISSION_GROUPS = [
  { title: "الطاولات والطلبات", items: ["view_dashboard", "view_tables", "manage_tables", "view_orders", "manage_orders", "cancel_orders", "reassign_orders", "handle_assistance"] },
  { title: "الفواتير والمدفوعات", items: ["view_payments", "verify_payments", "record_payment", "adjust_bill", "close_session"] },
  { title: "المنيو والتقارير", items: ["view_menu", "manage_menu", "view_reports"] },
  { title: "المحاسبة والتصدير", items: ["export_reports", "export_invoices", "export_payments", "export_sales", "manage_accounting_settings"] },
  { title: "إدارة المطعم", items: ["manage_staff", "manage_restaurant", "manage_branding", "manage_settings"] },
];

export const PERMISSION_LABELS = {
  view_dashboard: "عرض لوحة التحكم",
  view_tables: "عرض الطاولات والجلسات",
  manage_tables: "إدارة الطاولات ورموز QR",
  view_orders: "عرض الطلبات",
  manage_orders: "تحديث حالة الطلبات (المطبخ)",
  cancel_orders: "إلغاء أصناف من الطلبات",
  reassign_orders: "نقل الأصناف بين الطاولات",
  handle_assistance: "التعامل مع طلبات النادل",
  view_menu: "عرض المنيو",
  manage_menu: "إدارة المنيو",
  view_payments: "عرض الفواتير والمدفوعات",
  verify_payments: "تأكيد أو رفض المدفوعات",
  record_payment: "تسجيل الدفع",
  adjust_bill: "تعديل أسعار الفاتورة",
  close_session: "إغلاق جلسة الطاولة",
  view_reports: "عرض التقارير",
  manage_staff: "إدارة الموظفين",
  manage_restaurant: "تعديل بيانات المطعم",
  manage_branding: "الهوية والألوان",
  manage_subscription: "إدارة الاشتراك",
  manage_settings: "إعدادات المطعم",
  export_reports: "تصدير التقارير المحاسبية",
  export_invoices: "تصدير الفواتير",
  export_payments: "تصدير المدفوعات",
  export_sales: "تصدير المبيعات والأصناف",
  manage_accounting_settings: "إعدادات المحاسبة والحسابات",
  manage_users: "إدارة مستخدمي المنصة",
  manage_admin: "إدارة المنصة",
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
};

export const ROLE_LABELS = { owner: "صاحب المطعم", manager: "مدير", cashier: "كاشير", waiter: "نادل", kitchen: "مطبخ", admin: "إدارة المنصة" };
