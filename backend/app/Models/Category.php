<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Category extends Model { protected $fillable=['restaurant_id','name','display_order']; protected $casts=['display_order'=>'integer']; public function restaurant(){return $this->belongsTo(Restaurant::class);} public function products(){return $this->hasMany(Product::class);} }
