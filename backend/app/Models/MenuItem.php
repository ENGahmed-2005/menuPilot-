<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MenuItem extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'name', 'price', 'category', 'description', 'image_url', 'is_available'];
    protected $casts = ['price' => 'decimal:2', 'is_available' => 'boolean'];

    public function user() { return $this->belongsTo(User::class); }
    public function orderItems() { return $this->hasMany(OrderItem::class); }
}
