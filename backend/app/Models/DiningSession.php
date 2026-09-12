<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiningSession extends Model
{
    protected $table = 'dining_sessions';

    protected $fillable = ['restaurant_table_id', 'customer_name', 'customer_phone', 'status', 'opened_at', 'closed_at'];

    protected $casts = ['opened_at' => 'datetime', 'closed_at' => 'datetime'];

    public function restaurantTable()
    {
        return $this->belongsTo(RestaurantTable::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class, 'reassigned_to_session_id');
    }

    public function assistanceRequests()
    {
        return $this->hasMany(AssistanceRequest::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function billAdjustments()
    {
        return $this->hasMany(BillAdjustment::class);
    }
}
