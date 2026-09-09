<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration { public function up():void{Schema::table('restaurants',function(Blueprint $t){$t->string('plan')->default('basic')->after('name');$t->json('theme')->nullable()->after('plan');});} public function down():void{Schema::table('restaurants',function(Blueprint $t){$t->dropColumn(['plan','theme']);});} };
