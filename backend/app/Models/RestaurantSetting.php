<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RestaurantSetting extends Model
{
    protected $fillable = [
        'user_id', 'logo_url', 'background_url', 'primary_color', 'secondary_color',
        'text_color', 'button_color', 'card_style', 'font_family', 'show_menupilot_branding',
    ];

    protected $casts = ['show_menupilot_branding' => 'boolean'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
