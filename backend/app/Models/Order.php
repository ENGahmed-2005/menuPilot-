<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = ['dining_session_id', 'user_id', 'status', 'submitted_at', 'ready_at'];

    protected $casts = ['submitted_at' => 'datetime', 'ready_at' => 'datetime'];

    public function diningSession()
    {
        return $this->belongsTo(DiningSession::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
}
