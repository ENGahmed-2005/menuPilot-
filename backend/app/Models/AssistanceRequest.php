<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssistanceRequest extends Model
{
    protected $fillable = ['dining_session_id', 'status'];
    public function diningSession() { return $this->belongsTo(DiningSession::class); }
}
