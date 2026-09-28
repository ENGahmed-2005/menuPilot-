<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;

/**
 * trial_started | trial_7_days_remaining | trial_3_days_remaining |
 * trial_1_day_remaining | trial_expired | subscription_restricted |
 * subscription_requested | subscription_activated | subscription_cancelled
 * No listener is required yet; e-mail / in-app notifications can subscribe later.
 */
class SubscriptionLifecycleEvent
{
    use Dispatchable;

    public function __construct(public string $name, public int $restaurantId, public array $data = []) {}
}
