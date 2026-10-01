<?php

namespace App\Support;

/**
 * Plans and add-ons — the single source of truth for what a subscription
 * contains and costs (config/subscriptions.php, docs/SUBSCRIPTIONS.md).
 *
 *  plan     → basic | pro
 *  add-ons  → a list of ids from subscriptions.addons, each allowed only on
 *             the plans it lists (e.g. brand_plus needs pro)
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
     * known ids only, no duplicates, in catalogue order.
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

        return [$plan, array_values(array_intersect($known, $addons))];
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

    /** Every gated feature (what a trial gets). */
    public static function allFeatures(): array
    {
        $all = array_merge(...array_values(config('subscriptions.plan_features', [])));
        foreach (self::addons() as $addon) {
            $all = [...$all, ...$addon['features']];
        }

        return array_values(array_unique($all));
    }

    /** Catalogue for GET /api/subscription. */
    public static function catalogue(): array
    {
        return [
            'plans' => collect(self::plans())->map(fn ($id) => [
                'id' => $id,
                'name' => self::planName($id),
                'price' => config("subscriptions.prices.$id"),
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
