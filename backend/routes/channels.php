<?php

use App\Models\User;
use App\Support\SubscriptionAccess;
use Illuminate\Support\Facades\Broadcast;

/*
 * Realtime channels (App\Support\Realtime). Signals carry no data, and
 * screens refetch through the permission-checked API, but the restaurant
 * channel still admits only that restaurant's owner and staff.
 */
Broadcast::channel('restaurant.{ownerId}', function (User $user, int $ownerId) {
    $owner = SubscriptionAccess::for($user)->owner()?->id;

    return $owner !== null && (int) $owner === $ownerId;
});
