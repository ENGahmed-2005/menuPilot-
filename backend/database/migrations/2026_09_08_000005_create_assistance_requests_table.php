<?php
use Illuminate\Database\Migrations\Migration; use Illuminate\Database\Schema\Blueprint; use Illuminate\Support\Facades\Schema;
return new class extends Migration { public function up():void{Schema::create('assistance_requests',function(Blueprint $t){$t->id();$t->foreignId('dining_session_id')->constrained('dining_sessions')->cascadeOnDelete();$t->string('status')->default('open');$t->timestamp('requested_at')->useCurrent();$t->timestamp('resolved_at')->nullable();$t->timestamps();});} public function down():void{Schema::dropIfExists('assistance_requests');} };
