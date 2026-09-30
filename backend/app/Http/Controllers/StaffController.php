<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Models\User;
use App\Support\Audit;
use App\Support\Permissions;
use App\Support\ResolvesRestaurant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Staff accounts of a restaurant (owner, or a manager with manage_staff).
 *
 * Guard rails:
 *  - every query is scoped to the actor's restaurant;
 *  - nobody edits, disables or deletes their own staff record;
 *  - an actor can't grant permissions they don't hold themselves
 *    (a manager can't create a stronger account than their own);
 *  - disabling keeps the record and revokes the API token immediately.
 */
class StaffController extends Controller
{
    use ResolvesRestaurant;

    private function out($data, $status = 200)
    {
        return response()->json(['data' => $data], $status);
    }

    private function query(Request $request)
    {
        return Staff::where('user_id', $this->restaurantId($request))->with('accountUser');
    }

    public function index(Request $request)
    {
        return $this->out($this->query($request)->latest()->get()->map(fn ($s) => $this->serialize($s)));
    }

    public function store(Request $request)
    {
        $v = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:30',
            'role' => ['required', Rule::in(Permissions::STAFF_ROLES)],
            'permissions' => 'nullable|array',
            'permissions.*' => ['string', Rule::in(Permissions::assignable())],
            'password' => 'nullable|string|min:6',
        ]);

        $permissions = array_key_exists('permissions', $v) && $v['permissions'] !== null ? Permissions::sanitize($v['permissions']) : null;
        if ($denied = $this->exceedsActor($request, $v['role'], $permissions)) {
            return $denied;
        }

        $plainPassword = $v['password'] ?? $this->generatePassword();
        $restaurantId = $this->restaurantId($request);
        $owner = User::find($restaurantId);
        if (! $owner) {
            return response()->json(['message' => 'Restaurant owner not found'], 404);
        }

        $staff = DB::transaction(function () use ($restaurantId, $owner, $v, $plainPassword, $permissions) {
            $employee = User::create([
                'name' => $v['name'],
                'email' => $v['email'],
                'password' => Hash::make($plainPassword),
                'role' => $v['role'],
                'plan' => $owner->plan,
            ]);

            return Staff::create([
                'user_id' => $restaurantId,
                'account_user_id' => $employee->id,
                'name' => $v['name'],
                'email' => $v['email'],
                'phone' => $v['phone'] ?? null,
                'role' => $v['role'],
                'permissions' => $permissions,
                'active' => true,
            ]);
        });

        Audit::log($request, 'staff.created', 'staff', $staff->id, ['role' => $staff->role, 'custom_permissions' => $permissions], $restaurantId);
        $staff->load('accountUser');

        return $this->out(['staff' => $this->serialize($staff), 'generated_password' => $plainPassword], 201);
    }

    public function update(Request $request, $id)
    {
        $staff = $this->query($request)->where('id', $id)->first();
        if (! $staff) {
            return response()->json(['message' => 'Staff not found'], 404);
        }
        if ($this->isSelf($request, $staff)) {
            return response()->json(['message' => 'لا يمكنك تعديل صلاحيات أو حالة حسابك بنفسك.', 'code' => 'SELF_EDIT_FORBIDDEN'], 403);
        }

        $v = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('users', 'email')->ignore($staff->account_user_id)],
            'phone' => 'sometimes|nullable|string|max:30',
            'role' => ['sometimes', 'required', Rule::in(Permissions::STAFF_ROLES)],
            // null resets to the role defaults; an array sets a custom list.
            'permissions' => 'sometimes|nullable|array',
            'permissions.*' => ['string', Rule::in(Permissions::assignable())],
            'active' => 'sometimes|boolean',
            'password' => 'nullable|string|min:6',
        ]);

        $role = $v['role'] ?? $staff->role;
        $permissions = array_key_exists('permissions', $v)
            ? ($v['permissions'] === null ? null : Permissions::sanitize($v['permissions']))
            : $staff->permissions;
        if ($denied = $this->exceedsActor($request, $role, $permissions)) {
            return $denied;
        }

        $before = ['role' => $staff->role, 'permissions' => $staff->permissions, 'active' => (bool) $staff->active];

        DB::transaction(function () use ($staff, $v, $permissions) {
            $staffData = [];
            foreach (['name', 'email', 'phone', 'role', 'active'] as $field) {
                if (array_key_exists($field, $v)) {
                    $staffData[$field] = $v[$field];
                }
            }
            if (array_key_exists('permissions', $v)) {
                $staffData['permissions'] = $permissions;
            }
            $previousRole = $staff->role; // captured before saving
            if ($staffData) {
                $staff->update($staffData);
            }

            $user = $staff->account_user_id ? User::find($staff->account_user_id) : null;
            if ($user) {
                $userData = array_intersect_key($v, array_flip(['name', 'email', 'role']));
                if (! empty($v['password'])) {
                    $userData['password'] = Hash::make($v['password']);
                }
                // Disabling, a role change or a new password revoke the current
                // token (sign in again). Permission changes do NOT: they are
                // checked on every request, so they apply immediately and the
                // employee's screen refreshes them (AuthContext).
                if ((array_key_exists('active', $v) && ! $v['active']) || (isset($v['role']) && $v['role'] !== $previousRole) || ! empty($v['password'])) {
                    $userData['api_token'] = null;
                }
                if ($userData) {
                    $user->update($userData);
                }
            }
        });

        $staff->refresh()->load('accountUser');
        $after = ['role' => $staff->role, 'permissions' => $staff->permissions, 'active' => (bool) $staff->active];
        if ($before !== $after) {
            Audit::log($request, 'staff.access_changed', 'staff', $staff->id, ['before' => $before, 'after' => $after], $staff->user_id);
        }

        return $this->out($this->serialize($staff));
    }

    /** PATCH staff/{id}/status {active} — disable / re-enable without deleting. */
    public function status(Request $request, $id)
    {
        $request->validate(['active' => 'required|boolean']);

        return $this->update($request->replace(['active' => $request->boolean('active')]), $id);
    }

    public function destroy(Request $request, $id)
    {
        $staff = $this->query($request)->where('id', $id)->first();
        if (! $staff) {
            return response()->json(['message' => 'Staff not found'], 404);
        }
        if ($this->isSelf($request, $staff)) {
            return response()->json(['message' => 'لا يمكنك حذف حسابك بنفسك.', 'code' => 'SELF_EDIT_FORBIDDEN'], 403);
        }

        DB::transaction(function () use ($staff) {
            $accountUserId = $staff->account_user_id;
            $staff->delete();
            if ($accountUserId) {
                User::where('id', $accountUserId)->delete();
            }
        });
        Audit::log($request, 'staff.deleted', 'staff', $staff->id, ['role' => $staff->role, 'email' => $staff->email], $staff->user_id);

        return $this->out(['message' => 'Deleted']);
    }

    private function isSelf(Request $request, Staff $staff): bool
    {
        return (int) $staff->account_user_id === (int) $request->user()->id;
    }

    /** 403 when the resulting account would hold permissions the actor doesn't have. */
    private function exceedsActor(Request $request, string $role, ?array $permissions)
    {
        $target = $permissions ?? Permissions::defaultsFor($role);
        $missing = array_values(array_diff($target, Permissions::for($request->user())));
        if ($missing) {
            return response()->json([
                'message' => 'لا يمكنك منح صلاحيات لا تملكها.',
                'code' => 'PERMISSION_ESCALATION',
                'permissions' => $missing,
            ], 403);
        }

        return null;
    }

    private function generatePassword(): string
    {
        return 'MP-'.Str::upper(Str::random(5)).'-'.random_int(100, 999);
    }

    private function serialize(Staff $staff): array
    {
        return [
            'id' => $staff->id,
            'name' => $staff->name,
            'email' => $staff->email,
            'phone' => $staff->phone,
            'role' => $staff->role,
            'active' => (bool) $staff->active,
            'custom_permissions' => is_array($staff->permissions),
            'permissions' => is_array($staff->permissions) ? Permissions::sanitize($staff->permissions) : Permissions::defaultsFor($staff->role),
            'account_user_id' => $staff->account_user_id,
            'created_at' => optional($staff->created_at)->toIso8601String(),
            'last_active_at' => optional($staff->accountUser?->last_active_at)->toIso8601String(),
        ];
    }
}
