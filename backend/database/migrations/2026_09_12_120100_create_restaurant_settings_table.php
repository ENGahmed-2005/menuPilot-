<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restaurant_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('logo_url')->nullable();
            $table->string('background_url')->nullable();
            $table->string('primary_color', 20)->default('#B8793E');
            $table->string('secondary_color', 20)->default('#5B7A52');
            $table->string('text_color', 20)->default('#171717');
            $table->string('button_color', 20)->default('#171717');
            $table->string('card_style', 30)->default('rounded');
            $table->string('font_family', 100)->default('system');
            $table->boolean('show_menupilot_branding')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_settings');
    }
};
