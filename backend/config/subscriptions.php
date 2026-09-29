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
    'paid_plans' => ['basic', 'pro', 'premium'],

    // Prices are decided here (the client never sends an amount). Monthly.
    'currency' => env('SUBSCRIPTION_CURRENCY', 'USD'),
    'prices' => ['basic' => 15, 'pro' => 29, 'premium' => 49], // approved Sep 2026 (competitor review)
    // Paying 12 months at once: 2 months free (pay 10).
    'annual_free_months' => 2,
    // Display-only shekel equivalent next to USD prices.
    'display_ils_rate' => (float) env('SUBSCRIPTION_ILS_RATE', 3.65),
    'plan_names' => ['basic' => 'الأساسية', 'pro' => 'الاحترافية', 'premium' => 'المميزة'],
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
