<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Product extends Model { protected $fillable=['restaurant_id','category_id','name','price','image','is_available']; protected $casts=['price'=>'decimal:2','is_available'=>'boolean']; public function restaurant(){return $this->belongsTo(Restaurant::class);} public function category(){return $this->belongsTo(Category::class);} public function orderItems(){return $this->hasMany(OrderItem::class);} }
