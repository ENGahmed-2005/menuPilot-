<?php

namespace App\Http\Controllers;

use App\Models\MenuCategory;
use App\Models\Staff;
use App\Support\Audit;
use Illuminate\Http\Request;

class MenuCategoryController extends Controller
{
    /** Audit a menu_category change for this restaurant (secrets never included). */
    private function auditChange(Request $request, string $action, $id, array $metadata = []): void
    {
        Audit::log($request, $action, 'menu_category', $id === null ? null : (int) $id, $metadata, $this->restaurantId($request));
    }

    private function restaurantId(Request $request): int
    {
        $user = $request->user();

        if ($user->role === 'owner' || $user->role === 'admin') {
            return (int) $user->id;
        }

        return (int) Staff::where('account_user_id', $user->id)->value('user_id');
    }

    private function query(Request $request)
    {
        return MenuCategory::where('user_id', $this->restaurantId($request));
    }

    public function index(Request $request)
    {
        return response()->json([
            'data' => $this->query($request)->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $exists = $this->query($request)->whereRaw('LOWER(name) = ?', [mb_strtolower($data['name'])])->exists();
        if ($exists) {
            return response()->json(['message' => 'Category already exists.'], 422);
        }

        $category = $this->query($request)->create([
            'name' => trim($data['name']),
        ]);

        $this->auditChange($request, 'menu_category.created', $category->id, ['name' => $category->name]);

        return response()->json(['data' => $category], 201);
    }

    public function update(Request $request, $id)
    {
        $category = $this->query($request)->find($id);
        if (! $category) {
            return response()->json(['message' => 'Category not found'], 404);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $exists = $this->query($request)
            ->where('id', '!=', $id)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($data['name'])])
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Category already exists.'], 422);
        }

        $category->update(['name' => trim($data['name'])]);

        $this->auditChange($request, 'menu_category.updated', $category->id, ['after' => $category->only(['name', 'sort_order', 'is_active'])]);

        return response()->json(['data' => $category]);
    }

    public function destroy(Request $request, $id)
    {
        $category = $this->query($request)->find($id);
        if (! $category) {
            return response()->json(['message' => 'Category not found'], 404);
        }

        $category->delete();

        $this->auditChange($request, 'menu_category.deleted', (int) $id);

        return response()->json(['data' => ['message' => 'Deleted']]);
    }
}
