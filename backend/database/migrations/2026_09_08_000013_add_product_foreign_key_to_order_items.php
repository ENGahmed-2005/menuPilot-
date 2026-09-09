<?php
use Illuminate\Database\Migrations\Migration; use Illuminate\Database\Schema\Blueprint; use Illuminate\Support\Facades\Schema;
return new class extends Migration { public function up():void{Schema::table('order_items',function(Blueprint $t){$t->foreign('product_id')->references('id')->on('products')->restrictOnDelete();});} public function down():void{Schema::table('order_items',function(Blueprint $t){$t->dropForeign(['product_id']);});} };
