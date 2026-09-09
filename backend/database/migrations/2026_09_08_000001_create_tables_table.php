<?php
use Illuminate\Database\Migrations\Migration; use Illuminate\Database\Schema\Blueprint; use Illuminate\Support\Facades\Schema;
return new class extends Migration { public function up():void{Schema::create('tables',function(Blueprint $t){$t->id();$t->foreignId('restaurant_id')->constrained()->cascadeOnDelete();$t->string('label');$t->unsignedInteger('seats')->default(2);$t->string('code',64)->unique();$t->boolean('is_active')->default(true);$t->timestamps();$t->index(['restaurant_id','is_active']);});} public function down():void{Schema::dropIfExists('tables');} };
