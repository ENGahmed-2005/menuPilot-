<?php

namespace App\Http\Controllers;

use App\Models\RestaurantSetting;
use App\Models\Staff;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MenuController extends Controller
{
    private function out($d, $s = 200)
    {
        return response()->json(['data' => $d], $s);
    }

    private function restaurantId(Request $request): int
    {
        $user = $request->user();
        if ($user->role === 'owner' || $user->role === 'admin') {
            return (int) $user->id;
        }

        return (int) Staff::where('account_user_id', $user->id)->value('user_id');
    }

    private function q(Request $r)
    {
        return DB::table('menu_items')->where('user_id', $this->restaurantId($r))->whereNull('deleted_at');
    }

    /**
     * Store a base64 image sent by the current frontend as a real file and
     * return a short public URL. This keeps image_url small and avoids the
     * previous 2048-character validation/database limitation.
     */
    private function storeImage(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        // Already a stored URL/path: keep it unchanged.
        if (! Str::startsWith($value, 'data:image/')) {
            return $value;
        }

        if (! preg_match('/^data:image\/(jpeg|jpg|png|webp|gif);base64,(.+)$/s', $value, $matches)) {
            throw new \InvalidArgumentException('Invalid image data.');
        }

        $extension = $matches[1] === 'jpeg' ? 'jpg' : $matches[1];
        $decoded = base64_decode($matches[2], true);

        if ($decoded === false) {
            throw new \InvalidArgumentException('Invalid image data.');
        }

        // Keep the same 3 MB limit already shown by the Owner UI.
        if (strlen($decoded) > 3 * 1024 * 1024) {
            throw new \InvalidArgumentException('Image must not be larger than 3 MB.');
        }

        $path = 'menu-items/' . Str::uuid() . '.' . $extension;
        Storage::disk('public')->put($path, $decoded);

        return asset('storage/' . $path);
    }

    private function deleteStoredImage(?string $value): void
    {
        if (! $value || Str::startsWith($value, 'data:image/')) {
            return;
        }

        $prefix = rtrim(asset('storage/'), '/') . '/';
        if (Str::startsWith($value, $prefix)) {
            $path = Str::after($value, $prefix);
            if ($path && Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }
        }
    }

    private function normalizeItem($item)
    {
        if (! $item) {
            return null;
        }

        $item->imageUrl = $item->image_url;
        unset($item->image_url);
        return $item;
    }

    public function index(Request $r)
    {
        return $this->out($this->q($r)->latest()->get()->map(fn ($item) => $this->normalizeItem($item)));
    }

    public function store(Request $r)
    {
        $v = $r->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|gt:0',
            'category' => 'nullable|string',
            'description' => 'nullable|string',
            'imageUrl' => 'nullable|string',
        ]);

        try {
            $imageUrl = $this->storeImage($v['imageUrl'] ?? null);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $id = DB::table('menu_items')->insertGetId([
            'user_id' => $this->restaurantId($r),
            'name' => $v['name'],
            'price' => $v['price'],
            'category' => $v['category'] ?? null,
            'description' => $v['description'] ?? null,
            'image_url' => $imageUrl,
            'is_available' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->out($this->normalizeItem(DB::table('menu_items')->find($id)), 201);
    }

    public function update(Request $r, $id)
    {
        $item = $this->q($r)->find($id);
        if (! $item) {
            return response()->json(['message' => 'Menu item not found'], 404);
        }

        $v = $r->validate([
            'name' => 'sometimes|required|string|max:255',
            'price' => 'sometimes|required|numeric|gt:0',
            'category' => 'nullable|string',
            'description' => 'nullable|string',
            'imageUrl' => 'nullable|string',
            'is_available' => 'sometimes|boolean',
        ]);

        $data = [];
        foreach (['name', 'price', 'category', 'description', 'is_available'] as $k) {
            if (array_key_exists($k, $v)) {
                $data[$k] = $v[$k];
            }
        }

        if (array_key_exists('imageUrl', $v)) {
            try {
                $newImageUrl = $this->storeImage($v['imageUrl']);
            } catch (\InvalidArgumentException $e) {
                return response()->json(['message' => $e->getMessage()], 422);
            }

            if ($newImageUrl !== $item->image_url) {
                $this->deleteStoredImage($item->image_url);
            }
            $data['image_url'] = $newImageUrl;
        }

        $data['updated_at'] = now();
        $this->q($r)->where('id', $id)->update($data);

        return $this->out($this->normalizeItem(DB::table('menu_items')->find($id)));
    }

    public function destroy(Request $r, $id)
    {
        $item = $this->q($r)->where('id', $id)->first();
        if (! $item) {
            return response()->json(['message' => 'Menu item not found'], 404);
        }

        // Soft-delete the item so historical order_items keep their menu_item_id.
        // The item is automatically excluded from owner/public menu queries by q()/whereNull(deleted_at).
        DB::table('menu_items')->where('id', $id)->update([
            'is_available' => false,
            'deleted_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->out(['message' => 'Deleted']);
    }

    public function publicMenu($code)
    {
        $t = DB::table('restaurant_tables')->where('table_code', $code)->first();
        if (! $t) {
            return response()->json(['message' => 'This QR code is invalid or no longer active. Please ask a staff member for help.'], 404);
        }

        $owner = DB::table('users')->where('id', $t->user_id)->first();
        $branding = RestaurantSetting::where('user_id', $t->user_id)->first();
        $items = DB::table('menu_items')
            ->where('user_id', $t->user_id)
            ->whereNull('deleted_at')
            ->where('is_available', true)
            ->orderBy('category')
            ->orderBy('name')
            ->get()
            ->map(fn ($item) => $this->normalizeItem($item));

        return $this->out([
            'table' => $t,
            'restaurant' => [
                'id' => $owner?->id,
                'name' => $owner?->restaurant_name,
                'theme' => $owner?->theme,
                'branding' => $branding,
            ],
            'items' => $items,
        ]);
    }
}
