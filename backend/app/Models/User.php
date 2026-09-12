<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name', 'restaurant_name', 'restaurant_phone', 'restaurant_description',
        'restaurant_address', 'latitude', 'longitude', 'email', 'password',
        'plan', 'role', 'api_token', 'theme', 'payment_methods',
        'trial_started_at', 'trial_ends_at', 'subscription_started_at', 'subscription_ends_at',
    ];

    protected $hidden = ['password', 'remember_token', 'api_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'theme' => 'array',
            'payment_methods' => 'array',
            'latitude' => 'float',
            'longitude' => 'float',
            'trial_started_at' => 'datetime',
            'trial_ends_at' => 'datetime',
            'subscription_started_at' => 'datetime',
            'subscription_ends_at' => 'datetime',
        ];
    }

    public function restaurantTables() { return $this->hasMany(RestaurantTable::class); }
    public function menuItems() { return $this->hasMany(MenuItem::class); }
    public function staff() { return $this->hasMany(Staff::class); }
    public function orders() { return $this->hasMany(Order::class); }
    public function billAdjustments() { return $this->hasMany(BillAdjustment::class, 'cashier_id'); }
    public function restaurantSetting() { return $this->hasOne(RestaurantSetting::class); }

    public function refreshSubscriptionStatus(): self
    {
        if ($this->role === 'admin') return $this;
        if ($this->plan === 'trial' && $this->trial_ends_at && now()->gte($this->trial_ends_at)) {
            $this->plan = 'basic';
            $this->saveQuietly();
        }
        return $this->refresh();
    }

    public function trialActive(): bool
    {
        return $this->plan === 'trial' && $this->trial_ends_at && now()->lt($this->trial_ends_at);
    }

    public function subscriptionActive(): bool
    {
        return in_array($this->plan, ['basic','pro','premium'], true)
            && (!$this->subscription_ends_at || now()->lt($this->subscription_ends_at));
    }

    public function hasFeature(string $feature): bool
    {
        if ($this->role === 'admin' || $this->trialActive()) return true;
        return match ($feature) {
            'branding' => in_array($this->plan, ['pro','premium'], true) && $this->subscriptionActive(),
            'background' => in_array($this->plan, ['pro','premium'], true) && $this->subscriptionActive(),
            'full-colors' => in_array($this->plan, ['pro','premium'], true) && $this->subscriptionActive(),
            'custom-font' => $this->plan === 'premium' && $this->subscriptionActive(),
            'remove-branding' => $this->plan === 'premium' && $this->subscriptionActive(),
            'presets' => in_array($this->plan, ['pro','premium'], true) && $this->subscriptionActive(),
            default => false,
        };
    }
}
