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
];
