<?php

namespace App\Support;

/**
 * How a restaurant's customer menu looks, beyond colours and logo
 * (restaurant_settings.menu_style, docs: «تخصيص المنيو»). Every key is
 * optional; missing keys use DEFAULTS, unknown keys are dropped.
 */
class MenuStyle
{
    public const OPTIONS = [
        'layout' => ['compact', 'photo', 'grid', 'text'], // compact = small horizontal cards
        'image_side' => ['start', 'end'],
        'header' => ['cover', 'solid', 'minimal'],
        'logo_shape' => ['rounded', 'circle', 'square'],
        'chips' => ['pill', 'underline'],
        'price_color' => ['primary', 'text'],
    ];

    public const BOOLEANS = ['show_images', 'show_descriptions'];

    public const COLORS = ['background_color', 'surface_color'];

    public const DEFAULTS = [
        'layout' => 'grid', // two-column photo cards
        'image_side' => 'start',
        'header' => 'solid', // a band in the brand colour
        'logo_shape' => 'rounded',
        'chips' => 'pill',
        'price_color' => 'primary',
        'show_images' => true,
        'show_descriptions' => true,
        'background_color' => null, // null = the theme's background
        'surface_color' => '#FFFFFF',
        'tagline' => null, // null = «اطلب من هاتفك مباشرة»
    ];

    /** Rules for a `menu_style` object sent by the owner, keyed as menu_style.*. */
    public static function rules(): array
    {
        $rules = ['menu_style' => ['required', 'array']];
        foreach (self::OPTIONS as $key => $values) {
            $rules["menu_style.$key"] = ['sometimes', 'in:'.implode(',', $values)];
        }
        foreach (self::BOOLEANS as $key) {
            $rules["menu_style.$key"] = ['sometimes', 'boolean'];
        }
        foreach (self::COLORS as $key) {
            $rules["menu_style.$key"] = ['sometimes', 'nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'];
        }
        $rules['menu_style.tagline'] = ['sometimes', 'nullable', 'string', 'max:80'];

        return $rules;
    }

    /** Known keys of $changes over $current, booleans as booleans, tagline as plain text. */
    public static function merge(?array $current, array $changes): array
    {
        $style = array_intersect_key(array_merge($current ?? [], $changes), self::DEFAULTS);
        foreach (self::BOOLEANS as $key) {
            if (array_key_exists($key, $style)) {
                $style[$key] = filter_var($style[$key], FILTER_VALIDATE_BOOLEAN);
            }
        }
        if (isset($style['tagline'])) {
            $style['tagline'] = trim(strip_tags((string) $style['tagline'])) ?: null;
        }

        return $style;
    }
}
