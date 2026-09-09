<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Table extends Model { protected $fillable=['restaurant_id','label','seats','code','is_active']; protected $casts=['seats'=>'integer','is_active'=>'boolean']; public function restaurant(){return $this->belongsTo(Restaurant::class);} public function sessions(){return $this->hasMany(DiningSession::class);} }
