<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class OrderItem extends Model { protected $fillable=['order_id','product_id','quantity','unit_price','note','status','cancel_reason','reassigned_to_session_id']; protected $casts=['quantity'=>'integer','unit_price'=>'decimal:2']; public function order(){return $this->belongsTo(Order::class);} public function product(){return $this->belongsTo(Product::class);} public function reassignedSession(){return $this->belongsTo(DiningSession::class,'reassigned_to_session_id');} }
