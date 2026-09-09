<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $fillable = ['dining_session_id', 'method', 'amount', 'paid_at'];
    protected $casts = ['amount' => 'decimal:2', 'paid_at' => 'datetime'];
    public function diningSession() { return $this->belongsTo(DiningSession::class); }
}
