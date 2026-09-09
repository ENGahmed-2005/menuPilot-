<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Order extends Model { protected $fillable=['restaurant_id','dining_session_id','status','note','submitted_at','ready_at']; protected $casts=['submitted_at'=>'datetime','ready_at'=>'datetime']; public function restaurant(){return $this->belongsTo(Restaurant::class);} public function session(){return $this->belongsTo(DiningSession::class,'dining_session_id');} public function items(){return $this->hasMany(OrderItem::class);} }
