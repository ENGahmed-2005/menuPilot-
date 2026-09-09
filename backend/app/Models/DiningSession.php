<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class DiningSession extends Model { protected $table='dining_sessions'; protected $fillable=['restaurant_id','table_id','name','phone','status','opened_at','closed_at']; protected $casts=['opened_at'=>'datetime','closed_at'=>'datetime']; public function restaurant(){return $this->belongsTo(Restaurant::class);} public function table(){return $this->belongsTo(Table::class);} public function orders(){return $this->hasMany(Order::class);} public function assistanceRequests(){return $this->hasMany(AssistanceRequest::class);} }
