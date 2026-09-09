<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class AssistanceRequest extends Model { protected $fillable=['dining_session_id','status','requested_at','resolved_at']; protected $casts=['requested_at'=>'datetime','resolved_at'=>'datetime']; public function session(){return $this->belongsTo(DiningSession::class,'dining_session_id');} }
