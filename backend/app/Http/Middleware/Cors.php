<?php
namespace App\Http\Middleware;
use Closure;use Illuminate\Http\Request;
class Cors{
 public function handle(Request $r,Closure $next){$h=['Access-Control-Allow-Origin'=>'*','Access-Control-Allow-Methods'=>'GET, POST, PUT, PATCH, DELETE, OPTIONS','Access-Control-Allow-Headers'=>'Content-Type, Authorization, Accept'];if($r->isMethod('OPTIONS'))return response('',204,$h);$response=$next($r);foreach($h as $k=>$v)$response->headers->set($k,$v);return $response;}
}
