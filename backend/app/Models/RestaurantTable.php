<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RestaurantTable extends Model
{
    use HasFactory;

    protected $table = 'restaurant_tables';

    protected $fillable = ['user_id', 'label', 'seats', 'table_code', 'status'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function diningSessions()
    {
        return $this->hasMany(DiningSession::class);
    }
}
