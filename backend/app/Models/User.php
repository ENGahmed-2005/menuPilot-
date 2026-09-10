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
        'plan', 'role', 'api_token', 'theme',
    ];

    protected $hidden = ['password', 'remember_token', 'api_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'theme' => 'array',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    public function restaurantTables() { return $this->hasMany(RestaurantTable::class); }
    public function menuItems() { return $this->hasMany(MenuItem::class); }
    public function staff() { return $this->hasMany(Staff::class); }
    public function orders() { return $this->hasMany(Order::class); }
    public function billAdjustments() { return $this->hasMany(BillAdjustment::class, 'cashier_id'); }
}
