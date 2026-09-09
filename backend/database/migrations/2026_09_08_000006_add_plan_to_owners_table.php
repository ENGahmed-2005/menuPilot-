<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void { Schema::table('owners', function(Blueprint $t){ $t->string('plan')->default('basic')->after('email'); }); }
    public function down(): void { Schema::table('owners', function(Blueprint $t){ $t->dropColumn('plan'); }); }
};
