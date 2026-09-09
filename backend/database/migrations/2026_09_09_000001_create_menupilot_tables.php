<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
 public function up():void{
  Schema::table('users',function(Blueprint $t){$t->string('restaurant_name')->nullable()->after('name');$t->string('plan')->default('starter')->after('restaurant_name');$t->string('role')->default('owner')->after('plan');$t->string('api_token',80)->nullable()->unique()->after('password');$t->json('theme')->nullable()->after('api_token');});
  Schema::create('restaurant_tables',function(Blueprint $t){$t->id();$t->foreignId('user_id')->constrained()->cascadeOnDelete();$t->string('label');$t->unsignedInteger('seats')->default(2);$t->string('table_code',80)->unique();$t->string('status')->default('available');$t->timestamps();});
  Schema::create('menu_items',function(Blueprint $t){$t->id();$t->foreignId('user_id')->constrained()->cascadeOnDelete();$t->string('name');$t->decimal('price',10,2);$t->string('category')->nullable();$t->text('description')->nullable();$t->string('image_url')->nullable();$t->boolean('is_available')->default(true);$t->timestamps();});
  Schema::create('staff',function(Blueprint $t){$t->id();$t->foreignId('user_id')->constrained()->cascadeOnDelete();$t->string('name');$t->string('email')->nullable();$t->string('role')->default('waiter');$t->timestamps();});
  Schema::create('dining_sessions',function(Blueprint $t){$t->id();$t->foreignId('restaurant_table_id')->constrained('restaurant_tables')->cascadeOnDelete();$t->string('customer_name');$t->string('customer_phone')->nullable();$t->string('status')->default('opened');$t->timestamp('opened_at')->useCurrent();$t->timestamp('closed_at')->nullable();$t->timestamps();});
  Schema::create('orders',function(Blueprint $t){$t->id();$t->foreignId('dining_session_id')->constrained('dining_sessions')->cascadeOnDelete();$t->foreignId('user_id')->constrained()->cascadeOnDelete();$t->string('status')->default('pending');$t->timestamp('submitted_at')->useCurrent();$t->timestamp('ready_at')->nullable();$t->timestamps();});
  Schema::create('order_items',function(Blueprint $t){$t->id();$t->foreignId('order_id')->constrained()->cascadeOnDelete();$t->foreignId('menu_item_id')->constrained()->cascadeOnDelete();$t->unsignedInteger('quantity')->default(1);$t->decimal('unit_price',10,2);$t->text('note')->nullable();$t->string('status')->default('active');$t->text('cancel_reason')->nullable();$t->foreignId('reassigned_to_session_id')->nullable()->constrained('dining_sessions')->nullOnDelete();$t->timestamps();});
  Schema::create('assistance_requests',function(Blueprint $t){$t->id();$t->foreignId('dining_session_id')->constrained()->cascadeOnDelete();$t->string('status')->default('open');$t->timestamps();});
  Schema::create('payments',function(Blueprint $t){$t->id();$t->foreignId('dining_session_id')->constrained()->cascadeOnDelete();$t->string('method');$t->decimal('amount',10,2);$t->timestamp('paid_at')->useCurrent();$t->timestamps();});
  Schema::create('bill_adjustments',function(Blueprint $t){$t->id();$t->foreignId('dining_session_id')->constrained()->cascadeOnDelete();$t->foreignId('order_item_id')->constrained()->cascadeOnDelete();$t->decimal('old_price',10,2);$t->decimal('new_price',10,2);$t->foreignId('cashier_id')->constrained('users')->cascadeOnDelete();$t->timestamps();});
 }
 public function down():void{foreach(['bill_adjustments','payments','assistance_requests','order_items','orders','dining_sessions','staff','menu_items','restaurant_tables'] as $t)Schema::dropIfExists($t);Schema::table('users',function(Blueprint $t){$t->dropColumn(['restaurant_name','plan','role','api_token','theme']);});}
};
