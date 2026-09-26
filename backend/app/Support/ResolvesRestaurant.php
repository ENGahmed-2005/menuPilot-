<?php

namespace App\Support;

use App\Models\Staff;
use Illuminate\Http\Request;

/**
 * Resolves the tenant (restaurant owner user id) for the authenticated user.
 * Owners/admins are their own tenant; staff accounts belong to their owner.
 */
trait ResolvesRestaurant
{
    protected function restaurantId(Request $request): int
    {
        $user = $request->user();
        if ($user->role === 'owner' || $user->role === 'admin') {
            return (int) $user->id;
        }

        return (int) Staff::where('account_user_id', $user->id)->value('user_id');
    }
}
