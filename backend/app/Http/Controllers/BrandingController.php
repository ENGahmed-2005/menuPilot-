<?php

namespace App\Http\Controllers;

use App\Models\RestaurantSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BrandingController extends Controller
{
    private function settings(int $userId): RestaurantSetting
    {
        return RestaurantSetting::firstOrCreate(['user_id' => $userId]);
    }

    public function show(Request $request)
    {
        return response()->json(['data' => $this->settings($request->user()->id)]);
    }

    public function update(Request $request)
    {
        $user = $request->user();
        $user->refreshSubscriptionStatus();

        if (! $user->hasFeature('branding')) {
            return response()->json([
                'message' => 'Branding customization requires an active trial or paid plan.',
            ], 403);
        }

        $validated = $request->validate([
            'primary_color' => ['sometimes', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'secondary_color' => ['sometimes', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'text_color' => ['sometimes', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'button_color' => ['sometimes', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'card_style' => ['sometimes', 'in:rounded,soft,square'],
            'font_family' => ['sometimes', 'string', 'max:100'],
            'show_menupilot_branding' => ['sometimes', 'boolean'],
            'logo' => ['sometimes', 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'background' => ['sometimes', 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        if (array_key_exists('font_family', $validated) && $validated['font_family'] !== 'system' && ! $user->hasFeature('custom-font')) {
            return response()->json([
                'message' => 'Custom fonts require Premium or an active Trial.',
            ], 403);
        }

        if (array_key_exists('show_menupilot_branding', $validated) && $validated['show_menupilot_branding'] === false && ! $user->hasFeature('remove-branding')) {
            return response()->json([
                'message' => 'Removing menuPilot branding requires Premium or an active Trial.',
            ], 403);
        }
        $settings = $this->settings($user->id);

        foreach (['logo' => 'logo_url', 'background' => 'background_url'] as $file => $column) {
            if ($request->hasFile($file)) {
                if ($settings->{$column}) {
                    $old = parse_url($settings->{$column}, PHP_URL_PATH);
                    if ($old) {
                        Storage::disk('public')->delete(ltrim(str_replace('/storage/', '', $old), '/'));
                    }
                }
                $path = $request->file($file)->store('restaurant-branding', 'public');
                $validated[$column] = Storage::url($path);
            }
        }

        unset($validated['logo'], $validated['background']);

        $settings->update($validated);

        return response()->json(['data' => $settings->fresh()]);
    }

    public function reset(Request $request)
    {
        $settings = $this->settings($request->user()->id);

        $settings->update([
            'primary_color' => '#B8793E',
            'secondary_color' => '#5B7A52',
            'text_color' => '#171717',
            'button_color' => '#171717',
            'card_style' => 'rounded',
            'font_family' => 'system',
            'show_menupilot_branding' => true,
        ]);

        return response()->json(['data' => $settings->fresh()]);
    }
}
