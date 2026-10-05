<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('menu_items', 'deleted_at')) {
            Schema::table('menu_items', function (Blueprint $table) {
                $table->timestamp('deleted_at')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('menu_items', 'deleted_at')) {
            Schema::table('menu_items', function (Blueprint $table) {
                $table->dropColumn('deleted_at');
            });
        }
    }
};
