<?php

namespace App\Models;

use App\Support\SubscriptionAccess;
use App\Support\SubscriptionPlans;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'payment_timing',
        'name', 'restaurant_name', 'restaurant_phone', 'restaurant_description',
        'restaurant_address', 'latitude', 'longitude', 'email', 'password',
        'plan', 'role', 'api_token', 'login_failed_attempts', 'login_locked_until', 'theme', 'payment_methods',
        'trial_started_at', 'trial_ends_at', 'subscription_started_at', 'subscription_ends_at',
        'is_active', 'last_active_at',
    ];

    protected $hidden = ['password', 'remember_token', 'api_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'is_active' => 'boolean',
            'last_active_at' => 'datetime',
            'subscription_cancelled_at' => 'datetime',
            'plan_requested_at' => 'datetime',
            'subscription_notices' => 'array',
            'addons' => 'array',
            'requested_addons' => 'array',
            'password' => 'hashed',
            'theme' => 'array',
            'payment_methods' => 'array',
            'latitude' => 'float',
            'longitude' => 'float',
            'trial_started_at' => 'datetime',
            'trial_ends_at' => 'datetime',
            'subscription_started_at' => 'datetime',
            'subscription_ends_at' => 'datetime',
            'login_locked_until' => 'datetime',
        ];
    }

    public function restaurantTables()
    {
        return $this->hasMany(RestaurantTable::class);
    }

    public function menuItems()
    {
        return $this->hasMany(MenuItem::class);
    }

    public function staff()
    {
        return $this->hasMany(Staff::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function billAdjustments()
    {
        return $this->hasMany(BillAdjustment::class, 'cashier_id');
    }

    public function restaurantSetting()
    {
        return $this->hasOne(RestaurantSetting::class);
    }

    /**
     * Kept for existing callers. It used to turn an expired trial into a free
     * 'basic' plan (so trials never expired); the state is now computed by
     * App\Support\SubscriptionAccess and nothing is converted here.
     */
    public function refreshSubscriptionStatus(): self
    {
        if ($this->role === 'owner') {
            SubscriptionAccess::for($this)->sync();
        }

        return $this->refresh();
    }

    public function trialActive(): bool
    {
        return $this->plan === 'trial' && $this->trial_ends_at && now()->lt($this->trial_ends_at);
    }

    public function subscriptionActive(): bool
    {
        return in_array($this->plan, SubscriptionPlans::plans(), true)
            && (! $this->subscription_ends_at || now()->lt($this->subscription_ends_at));
    }

    /**
     * Gated features this restaurant can use right now: everything during a
     * trial, the plan's and add-ons' features while the subscription runs
     * (config/subscriptions.php), nothing otherwise.
     *
     * @return list<string>
     */
    public function features(): array
    {
        if ($this->role === 'admin' || $this->trialActive()) {
            return SubscriptionPlans::allFeatures();
        }

        return $this->subscriptionActive() ? SubscriptionPlans::features($this->plan, $this->addons ?? []) : [];
    }

    public function hasFeature(string $feature): bool
    {
        return in_array($feature, $this->features(), true);
    }
}
