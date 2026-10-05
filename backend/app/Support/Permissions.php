<?php

namespace App\Support;

use App\Models\Staff;
use App\Models\User;

/**
 * Permission registry — the single source of truth for authorization.
 *
 *  admin   → every permission (platform)
 *  owner   → every restaurant permission, scoped to their own restaurant
 *  staff   → their role's defaults, or the custom list the owner saved on
 *            the staff record (staff.permissions). Custom lists can only
 *            contain restaurant permissions, never platform ones.
 *  inactive staff / disabled accounts → no permissions at all.
 *
 * Routes enforce these with the `permission:` middleware; the frontend only
 * mirrors them (user.permissions) to hide actions.
 */
class Permissions
{
    public const LABELS = [
        'view_dashboard' => 'عرض لوحة التحكم',
        'view_tables' => 'عرض الطاولات والجلسات',
        'manage_tables' => 'إدارة الطاولات ورموز QR',
        'view_orders' => 'عرض الطلبات',
        'manage_orders' => 'تحديث حالة الطلبات (المطبخ)',
        'cancel_orders' => 'إلغاء أصناف من الطلبات',
        'reassign_orders' => 'نقل الأصناف بين الطاولات',
        'handle_assistance' => 'التعامل مع طلبات النادل',
        'deliver_orders' => 'توصيل الطلبات الخارجية',
        'dispatch_deliveries' => 'توزيع طلبات التوصيل على السائقين',
        'view_menu' => 'عرض المنيو',
        'manage_menu' => 'إدارة المنيو',
        'view_payments' => 'عرض الفواتير والمدفوعات',
        'verify_payments' => 'تأكيد أو رفض المدفوعات',
        'record_payment' => 'تسجيل الدفع',
        'adjust_bill' => 'تعديل أسعار الفاتورة',
        'close_session' => 'إغلاق جلسة الطاولة',
        'view_reports' => 'عرض التقارير',
        'manage_staff' => 'إدارة الموظفين',
        'manage_restaurant' => 'تعديل بيانات المطعم',
        'manage_branding' => 'الهوية والألوان',
        'manage_subscription' => 'إدارة الاشتراك',
        'manage_settings' => 'إعدادات المطعم',
        'export_reports' => 'تصدير التقارير المحاسبية',
        'export_invoices' => 'تصدير الفواتير',
        'export_payments' => 'تصدير المدفوعات',
        'export_sales' => 'تصدير المبيعات والأصناف',
        'manage_accounting_settings' => 'إعدادات المحاسبة والحسابات',
        'manage_finance' => 'الرواتب والمصاريف والأرباح',
        'manage_users' => 'إدارة مستخدمي المنصة',
        'manage_admin' => 'إدارة المنصة',
    ];

    /** Platform-only permissions: never granted to owners or staff. */
    public const PLATFORM = ['manage_users', 'manage_admin'];

    /** Permissions only the owner holds (a manager can't grant them to anyone). */
    public const OWNER_ONLY = ['manage_subscription'];

    public const ROLE_DEFAULTS = [
        'cashier' => [
            'view_dashboard', 'view_tables', 'view_orders', 'view_menu', 'view_payments', 'verify_payments',
            'record_payment', 'adjust_bill', 'close_session', 'cancel_orders', 'reassign_orders', 'handle_assistance',
        ],
        'waiter' => ['view_tables', 'view_orders', 'view_menu', 'cancel_orders', 'reassign_orders', 'handle_assistance'],
        'kitchen' => ['view_orders', 'manage_orders', 'view_menu'],
        // Delivery driver: sees and completes delivery orders only.
        'delivery' => ['deliver_orders'],
        // Delivery manager: assigns delivery orders to drivers and follows them.
        'delivery_manager' => ['dispatch_deliveries', 'deliver_orders'],
    ];

    /** A manager starts read-only; the owner grants management explicitly. */
    public const MANAGER_DEFAULTS = ['view_dashboard', 'view_tables', 'view_orders', 'view_menu', 'view_payments', 'view_reports'];

    public const STAFF_ROLES = ['manager', 'cashier', 'waiter', 'kitchen', 'delivery', 'delivery_manager'];

    public static function all(): array
    {
        return array_keys(self::LABELS);
    }

    public static function restaurant(): array
    {
        return array_values(array_diff(self::all(), self::PLATFORM));
    }

    /** Permissions an owner may assign to a staff member. */
    public static function assignable(): array
    {
        return array_values(array_diff(self::restaurant(), self::OWNER_ONLY));
    }

    public static function defaultsFor(string $role): array
    {
        if ($role === 'manager') {
            return self::MANAGER_DEFAULTS;
        }

        return self::ROLE_DEFAULTS[$role] ?? [];
    }

    /** Effective permissions of an authenticated user. */
    public static function for(User $user, ?Staff $staff = null): array
    {
        if (isset($user->is_active) && ! $user->is_active) {
            return [];
        }
        // The platform admin runs the platform, not restaurants: no implicit
        // access to any restaurant's tables, orders, payments or staff.
        if ($user->role === 'admin') {
            return self::PLATFORM;
        }
        if ($user->role === 'owner') {
            return self::restaurant();
        }

        $staff ??= Staff::where('account_user_id', $user->id)->first();
        if (! $staff || ! $staff->active || $staff->role !== $user->role) {
            return [];
        }

        $custom = $staff->permissions;
        $list = is_array($custom) ? $custom : self::defaultsFor($staff->role);

        return array_values(array_intersect($list, self::assignable()));
    }

    /** True when the user holds at least one of the given permissions. */
    public static function allows(User $user, string|array $permissions): bool
    {
        $granted = self::for($user);

        return (bool) array_intersect((array) $permissions, $granted);
    }

    /** Keep only known, assignable permission names (for staff updates). */
    public static function sanitize(array $permissions): array
    {
        return array_values(array_unique(array_intersect($permissions, self::assignable())));
    }
}
