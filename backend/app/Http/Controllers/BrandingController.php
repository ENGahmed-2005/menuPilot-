<?php

namespace App\Http\Controllers;

use App\Models\RestaurantSetting;
use App\Support\MediaStore;
use App\Support\MenuStyle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

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
                'message' => 'تخصيص هوية المنيو يحتاج الخطة الاحترافية، أو تجربة مجانية سارية.',
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
                'message' => 'الخط المخصص يحتاج إضافة «الهوية الكاملة» مع الخطة الاحترافية، أو تجربة مجانية سارية.',
            ], 403);
        }

        if (array_key_exists('show_menupilot_branding', $validated) && $validated['show_menupilot_branding'] === false && ! $user->hasFeature('remove-branding')) {
            return response()->json([
                'message' => 'إخفاء شعار menuPilot يحتاج إضافة «الهوية الكاملة» مع الخطة الاحترافية، أو تجربة مجانية سارية.',
            ], 403);
        }
        $settings = $this->settings($user->id);

        // menu_style arrives as JSON text from a multipart form, or as an object.
        if ($request->has('menu_style')) {
            $raw = $request->input('menu_style');
            $style = is_string($raw) ? json_decode($raw, true) : $raw;
            Validator::make(['menu_style' => is_array($style) ? $style : null], MenuStyle::rules(), [
                'menu_style.required' => 'شكل المنيو غير صالح.',
                'menu_style.*.in' => 'هذا الخيار غير متاح لشكل المنيو.',
                'menu_style.*.regex' => 'اللون يجب أن يكون بصيغة ‎#RRGGBB.',
                'menu_style.tagline.max' => 'العبارة التعريفية يجب ألا تتجاوز 80 حرفاً.',
            ])->validate();
            $validated['menu_style'] = MenuStyle::merge($settings->menu_style, $style);
        }

        foreach (['logo' => 'logo_url', 'background' => 'background_url'] as $file => $column) {
            if ($request->hasFile($file)) {
                $old = $settings->{$column};
                if ($old && str_contains($old, '/storage/')) {
                    // Legacy file on the local disk.
                    Storage::disk('public')->delete(ltrim(str_replace('/storage/', '', (string) parse_url($old, PHP_URL_PATH)), '/'));
                }
                MediaStore::forget($old);
                // Database-backed so the logo/background survive redeploys.
                $upload = $request->file($file);
                $validated[$column] = MediaStore::put((string) file_get_contents($upload->getRealPath()), (string) $upload->getMimeType(), $user->id);
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
            'secondary_color' => '#4B6A8A', // slate blue (brand: navy + orange, no green)
            'text_color' => '#172331',
            'button_color' => '#1F2D3D',
            'card_style' => 'rounded',
            'font_family' => 'system',
            'show_menupilot_branding' => true,
            'menu_style' => null,
        ]);

        return response()->json(['data' => $settings->fresh()]);
    }
}
