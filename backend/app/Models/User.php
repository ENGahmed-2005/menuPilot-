<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;
    protected $fillable=['name','restaurant_name','email','password','plan','role','api_token','theme'];
    protected $hidden=['password','remember_token','api_token'];
    protected function casts(): array { return ['email_verified_at'=>'datetime','password'=>'hashed','theme'=>'array']; }
}
