<?php

namespace App\Support;

/**
 * What a restaurant can use — the platform-admin counterpart of staff
 * permissions (docs/SUBSCRIPTIONS.md → «صلاحيات المطاعم»).
 *
 *  plan + add-ons → the default features (config/subscriptions.php)
 *  admin overrides → users.feature_overrides {grant: [...], revoke: [...]},
 *                    kept as a difference from the plan so they survive a
 *                    plan change
 *  result          → User::entitlements() / User::features() / hasFeature()
 *
 * The API enforces them (`feature:` middleware and controller checks); the
 * UI only mirrors user.subscription.features.
 */
class RestaurantFeatures
{
    public const GROUPS = [
        ['title' => 'التشغيل', 'items' => [
            'dine_in' => 'الطاولات والطلب من الطاولة',
            'kitchen' => 'شاشة المطبخ',
            'cashier' => 'شاشة الكاشير وفواتير الطاولات',
            'waiter' => 'شاشة النادل',
            'staff' => 'إضافة موظفين جدد',
        ]],
        ['title' => 'التوصيل', 'items' => [
            'online_orders' => 'التوصيل والطلب أونلاين',
        ]],
        ['title' => 'التقارير', 'items' => [
            'reports' => 'التقارير والإحصائيات',
        ]],
        ['title' => 'الهوية والتصميم', 'items' => [
            'branding' => 'شعار وهوية المنيو',
            'background' => 'خلفية المنيو',
            'full-colors' => 'ألوان المنيو بالكامل',
            'presets' => 'قوالب جاهزة لتصميم المنيو',
            'theme-presets' => 'ثيمات جاهزة للوحة التحكم',
            'custom-theme' => 'ألوان مخصصة للوحة التحكم',
            'custom-font' => 'خط مخصص للمنيو',
            'remove-branding' => 'إخفاء شعار menuPilot',
        ]],
    ];

    /**
     * Need a running trial or subscription: they stop when it ends, even
     * during the grace days. The rest follow restricted mode only (the
     * `subscription` middleware), so reading data stays open.
     */
    public const PAID_EXTRAS = ['online_orders', 'branding', 'background', 'full-colors', 'presets', 'theme-presets', 'custom-theme', 'custom-font', 'remove-branding'];

    /** @return list<string> */
    public static function keys(): array
    {
        return array_merge(...array_map(fn ($g) => array_keys($g['items']), self::GROUPS));
    }

    public static function label(string $key): string
    {
        foreach (self::GROUPS as $group) {
            if (isset($group['items'][$key])) {
                return $group['items'][$key];
            }
        }

        return $key;
    }

    /** In catalogue order, known keys only. */
    public static function ordered(array $keys): array
    {
        return array_values(array_intersect(self::keys(), $keys));
    }

    /**
     * Overrides that still mean something against the plan's defaults:
     * a grant of what the plan has, or a revoke of what it lacks, is dropped.
     *
     * @return array{grant: list<string>, revoke: list<string>}
     */
    public static function effectiveOverrides(?array $overrides, array $planFeatures): array
    {
        return [
            'grant' => self::ordered(array_diff($overrides['grant'] ?? [], $planFeatures)),
            'revoke' => self::ordered(array_intersect($overrides['revoke'] ?? [], $planFeatures)),
        ];
    }

    /** Overrides that turn the plan's defaults into exactly $enabled. */
    public static function overridesFor(array $enabled, array $planFeatures): ?array
    {
        $o = ['grant' => self::ordered(array_diff($enabled, $planFeatures)), 'revoke' => self::ordered(array_diff($planFeatures, $enabled))];

        return $o['grant'] || $o['revoke'] ? $o : null;
    }

    public static function apply(array $planFeatures, ?array $overrides): array
    {
        $o = self::effectiveOverrides($overrides, $planFeatures);

        return self::ordered(array_diff([...$planFeatures, ...$o['grant']], $o['revoke']));
    }
}
