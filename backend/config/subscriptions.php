<?php

/*
| Subscription & free trial (docs/SUBSCRIPTIONS.md). The frontend never
| decides dates or status: it reads them from /api/auth/me → subscription.
*/
return [
    'trial' => [
        'name' => 'Free Trial',
        'days' => (int) env('TRIAL_DAYS', 14),
        'price' => 0,
        'features' => 'all', // full access while the trial runs
    ],
    // After the trial ends: operations continue with an urgent warning, then restricted mode.
    'grace_days' => (int) env('TRIAL_GRACE_DAYS', 3),
    // Days-remaining milestones that fire a notification event once each.
    'notify_days' => [7, 3, 1],
    // Two plans + paid add-ons (Oct 2026). A restaurant pays its plan plus the
    // add-ons it picks; nothing it doesn't use. A restaurant without tables can
    // take delivery on its own (delivery_only).
    'paid_plans' => ['basic', 'pro', 'delivery_only'],

    // Prices are decided here (the client never sends an amount). Monthly.
    'currency' => env('SUBSCRIPTION_CURRENCY', 'USD'),
    'prices' => ['basic' => 15, 'pro' => 29, 'delivery_only' => 15], // basic/pro approved Sep 2026 (competitor review)
    // Paying 12 months at once: 2 months free (pay 10).
    'annual_free_months' => 2,
    // Display-only shekel equivalent next to USD prices.
    'display_ils_rate' => (float) env('SUBSCRIPTION_ILS_RATE', 3.65),
    'plan_names' => ['basic' => 'الأساسية', 'pro' => 'الاحترافية', 'delivery_only' => 'التوصيل فقط'],

    // Features each plan gives by default (keys: App\Support\RestaurantFeatures).
    // The menu, orders and the dashboard are in every plan and not listed.
    // The platform admin can grant or revoke any of them per restaurant.
    'plan_features' => [
        'basic' => ['dine_in', 'kitchen', 'cashier', 'waiter', 'staff'],
        'pro' => ['dine_in', 'kitchen', 'cashier', 'waiter', 'staff', 'reports', 'branding', 'background', 'full-colors', 'theme-presets', 'presets'],
        // Online ordering itself, no tables.
        'delivery_only' => ['kitchen', 'staff', 'online_orders'],
    ],

    // Monthly add-ons on top of a plan. `plans` = the plans it can be added to.
    // Pro + both add-ons = 49, the old Premium price, with the same features.
    'addons' => [
        'delivery' => [
            'name' => 'التوصيل والطلب أونلاين',
            'description' => 'استقبل طلبات الاستلام والتوصيل من رابط ورمز QR خاص بمطعمك، مع مناطق ورسوم توصيل.',
            'price' => 15,
            'plans' => ['basic', 'pro'],
            'features' => ['online_orders'],
        ],
        'brand_plus' => [
            'name' => 'الهوية الكاملة',
            'description' => 'خط مخصص للمنيو، وألوان لوحة تحكم مخصصة، وإخفاء شعار menuPilot.',
            'price' => 5,
            'plans' => ['pro'],
            'features' => ['custom-font', 'remove-branding', 'custom-theme'],
        ],
    ],

    // Retired plans still accepted from old clients and mapped to plan + add-ons.
    'legacy_plans' => [
        'premium' => ['plan' => 'pro', 'addons' => ['delivery', 'brand_plus']],
    ],
    'periods' => [1, 3, 6, 12], // months the owner can pay for at once

    // Manual bank transfer (Bank of Palestine). Set the real details in the
    // hosting environment; nothing sensitive is committed to the repository.
    'bank' => [
        'name' => env('SUBSCRIPTION_BANK_NAME', 'بنك فلسطين'),
        'account_name' => env('SUBSCRIPTION_BANK_ACCOUNT_NAME', ''),
        'account_number' => env('SUBSCRIPTION_BANK_ACCOUNT_NUMBER', ''),
        'iban' => env('SUBSCRIPTION_BANK_IBAN', ''),
        'branch' => env('SUBSCRIPTION_BANK_BRANCH', ''),
    ],
    // Where the owner is sent after reporting a transfer.
    'whatsapp' => env('SUBSCRIPTION_WHATSAPP', '+970597401925'),
];
