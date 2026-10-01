<?php

namespace App\Support;

/**
 * Plans and add-ons — the single source of truth for what a subscription
 * contains and costs (config/subscriptions.php, docs/SUBSCRIPTIONS.md).
 *
 *  plan     → basic | pro | delivery_only (online ordering alone, no tables)
 *  add-ons  → a list of ids from subscriptions.addons, each allowed only on
 *             the plans it lists (e.g. brand_plus needs pro); an add-on the
 *             plan already includes (delivery on delivery_only) is dropped
 *  price    → (plan price + add-on prices) per month, decided here only
 *
 * Retired plans (premium) are mapped to plan + add-ons so old clients and old
 * rows keep the exact same features and price.
 */
class SubscriptionPlans
{
    /** @return list<string> */
    public static function plans(): array
    {
        return config('subscriptions.paid_plans', []);
    }

    /** Plan ids the API accepts: current plans plus retired aliases. */
    public static function acceptedPlans(): array
    {
        return [...self::plans(), ...array_keys(config('subscriptions.legacy_plans', []))];
    }

    /** @return array<string, array{name: string, description: string, price: int|float, plans: list<string>, features: list<string>}> */
    public static function addons(): array
    {
        return config('subscriptions.addons', []);
    }

    /**
     * Map a retired plan to its replacement and clean the add-on list:
     * known ids only, no duplicates, in catalogue order, and none the plan
     * already includes (never charged twice).
     *
     * @return array{0: string, 1: list<string>}
     */
    public static function normalize(string $plan, ?array $addons = []): array
    {
        $addons = array_values(array_filter((array) $addons, 'is_string'));
        if ($legacy = config("subscriptions.legacy_plans.$plan")) {
            $plan = $legacy['plan'];
            $addons = [...$addons, ...$legacy['addons']];
        }
        $known = array_keys(self::addons());
        $addons = array_filter(array_intersect($known, $addons), fn ($id) => ! self::includes($plan, $id));

        return [$plan, array_values($addons)];
    }

    /** Does the plan already contain everything the add-on gives? */
    public static function includes(string $plan, string $addonId): bool
    {
        $addonFeatures = self::addons()[$addonId]['features'] ?? [];

        return $addonFeatures && ! array_diff($addonFeatures, config("subscriptions.plan_features.$plan", []));
    }

    /** Does the plan come with tables and QR table sessions? Trials do. */
    public static function allowsDineIn(?string $plan): bool
    {
        return ! in_array($plan, self::plans(), true) || in_array('dine_in', config("subscriptions.plan_features.$plan", []), true);
    }

    /** Arabic message for the first add-on the plan can't take, or null when all fit. */
    public static function incompatibility(string $plan, array $addons): ?string
    {
        foreach ($addons as $id) {
            $addon = self::addons()[$id] ?? null;
            if ($addon && ! in_array($plan, $addon['plans'], true)) {
                $planNames = implode(' أو ', array_map(fn ($p) => self::planName($p), $addon['plans']));

                return "إضافة «{$addon['name']}» متاحة مع الخطة {$planNames} فقط.";
            }
        }

        return null;
    }

    /** Monthly price of a plan with its add-ons. */
    public static function monthlyPrice(string $plan, array $addons = []): float
    {
        $price = (float) config("subscriptions.prices.$plan", 0);
        foreach ($addons as $id) {
            $price += (float) (self::addons()[$id]['price'] ?? 0);
        }

        return $price;
    }

    public static function planName(?string $plan): string
    {
        return (string) config("subscriptions.plan_names.$plan", $plan);
    }

    /** @return list<string> */
    public static function addonNames(array $addons): array
    {
        return array_values(array_map(fn ($id) => self::addons()[$id]['name'] ?? $id, $addons));
    }

    /** "الاحترافية + التوصيل والطلب أونلاين" — for invoices and WhatsApp. */
    public static function label(?string $plan, array $addons = []): string
    {
        return implode(' + ', [self::planName($plan), ...self::addonNames($addons)]);
    }

    /** Gated features unlocked by a plan and its add-ons (no subscription-state check). */
    public static function features(?string $plan, array $addons = []): array
    {
        $features = config("subscriptions.plan_features.$plan", []);
        foreach ($addons as $id) {
            $addon = self::addons()[$id] ?? null;
            // An add-on only counts on a plan that can take it.
            if ($addon && in_array($plan, $addon['plans'], true)) {
                $features = [...$features, ...$addon['features']];
            }
        }

        return array_values(array_unique($features));
    }

    /** Every feature (what a trial gets). */
    public static function allFeatures(): array
    {
        return RestaurantFeatures::keys();
    }

    /** A restaurant's default features before admin overrides (trial = all). */
    public static function defaultsFor(?string $plan, array $addons = []): array
    {
        return $plan === 'trial' ? self::allFeatures() : RestaurantFeatures::ordered(self::features($plan, $addons));
    }

    /** Catalogue for GET /api/subscription. */
    public static function catalogue(): array
    {
        return [
            'plans' => collect(self::plans())->map(fn ($id) => [
                'id' => $id,
                'name' => self::planName($id),
                'price' => config("subscriptions.prices.$id"),
                'dine_in' => self::allowsDineIn($id),
            ])->values()->all(),
            'addons' => collect(self::addons())->map(fn ($a, $id) => [
                'id' => $id,
                'name' => $a['name'],
                'description' => $a['description'],
                'price' => $a['price'],
                'plans' => $a['plans'],
            ])->values()->all(),
        ];
    }
}
