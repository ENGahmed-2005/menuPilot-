<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RestaurantSetting extends Model
{
    protected $fillable = [
        'user_id', 'logo_url', 'background_url', 'primary_color', 'secondary_color',
        'text_color', 'button_color', 'card_style', 'font_family', 'show_menupilot_branding', 'menu_style',
    ];

    protected $casts = ['show_menupilot_branding' => 'boolean', 'menu_style' => 'array'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
