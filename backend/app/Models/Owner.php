<?php
namespace App\Models;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;
class Owner extends Authenticatable {
 use HasApiTokens,Notifiable;
 protected $fillable=['restaurant_id','name','email','role','active','plan','password','phone','failed_attempts','locked_until'];
 protected $hidden=['password','remember_token'];
 protected $casts=['password'=>'hashed','locked_until'=>'datetime','active'=>'boolean'];
 public function restaurant(){return $this->belongsTo(Restaurant::class);}
}
