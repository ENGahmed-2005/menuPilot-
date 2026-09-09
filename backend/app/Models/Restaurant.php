<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Restaurant extends Model { protected $fillable=['name','plan','theme']; protected $casts=['theme'=>'array']; public function owners(){return $this->hasMany(Owner::class);} public function categories(){return $this->hasMany(Category::class);} public function products(){return $this->hasMany(Product::class);} public function tables(){return $this->hasMany(Table::class);} }
