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
    'prices' => ['basic' => 19, 'pro' => 39, 'premium' => 69],
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
