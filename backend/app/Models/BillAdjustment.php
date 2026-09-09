<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillAdjustment extends Model
{
    protected $fillable = ['dining_session_id', 'order_item_id', 'old_price', 'new_price', 'cashier_id'];
    protected $casts = ['old_price' => 'decimal:2', 'new_price' => 'decimal:2'];

    public function diningSession() { return $this->belongsTo(DiningSession::class); }
    public function orderItem() { return $this->belongsTo(OrderItem::class); }
    public function cashier() { return $this->belongsTo(User::class, 'cashier_id'); }
}
