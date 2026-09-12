<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StaffController extends Controller
{
    private function out($data, $status = 200)
    {
        return response()->json(['data' => $data], $status);
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
        return Staff::where('user_id', $this->restaurantId($request))->with('accountUser');
    }

    public function index(Request $request)
    {
        return $this->out($this->query($request)->get()->map(fn ($staff) => $this->serialize($staff)));
    }

    public function store(Request $request)
    {
        $v = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:waiter,cashier,kitchen,manager',
            'password' => 'nullable|string|min:6',
        ]);

        $plainPassword = $v['password'] ?? $this->generatePassword();
        $restaurantId = $this->restaurantId($request);

        $owner = User::find($restaurantId);
        if (! $owner) {
            return response()->json(['message' => 'Restaurant owner not found'], 404);
        }

        $staff = DB::transaction(function () use ($restaurantId, $owner, $v, $plainPassword) {
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
                'role' => $v['role'],
                'active' => true,
            ]);
        });

        $staff->load('accountUser');

        return $this->out(['staff' => $this->serialize($staff), 'generated_password' => $plainPassword], 201);
    }

    public function update(Request $request, $id)
    {
        $staff = $this->query($request)->where('id', $id)->first();
        if (! $staff) {
            return response()->json(['message' => 'Staff not found'], 404);
        }

        $v = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('users', 'email')->ignore($staff->account_user_id)],
            'role' => 'sometimes|required|in:waiter,cashier,kitchen,manager',
            'active' => 'sometimes|boolean',
            'password' => 'nullable|string|min:6',
        ]);

        DB::transaction(function () use ($staff, $v) {
            $staffData = [];
            foreach (['name', 'email', 'role', 'active'] as $field) {
                if (array_key_exists($field, $v)) {
                    $staffData[$field] = $v[$field];
                }
            }
            if ($staffData) {
                $staff->update($staffData);
            }

            if ($staff->account_user_id) {
                $user = User::find($staff->account_user_id);
                if ($user) {
                    $userData = [];
                    if (isset($v['name'])) {
                        $userData['name'] = $v['name'];
                    }
                    if (isset($v['email'])) {
                        $userData['email'] = $v['email'];
                    }
                    if (isset($v['role'])) {
                        $userData['role'] = $v['role'];
                    }
                    if (! empty($v['password'])) {
                        $userData['password'] = Hash::make($v['password']);
                    }
                    if (array_key_exists('active', $v) && ! $v['active']) {
                        $userData['api_token'] = null;
                    }
                    if ($userData) {
                        $user->update($userData);
                    }
                }
            }
        });

        $staff->refresh()->load('accountUser');

        return $this->out($this->serialize($staff));
    }

    public function destroy(Request $request, $id)
    {
        $staff = $this->query($request)->where('id', $id)->first();
        if (! $staff) {
            return response()->json(['message' => 'Staff not found'], 404);
        }

        DB::transaction(function () use ($staff) {
            $accountUserId = $staff->account_user_id;
            $staff->delete();
            if ($accountUserId) {
                User::where('id', $accountUserId)->delete();
            }
        });

        return $this->out(['message' => 'Deleted']);
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
            'role' => $staff->role,
            'active' => (bool) $staff->active,
            'account_user_id' => $staff->account_user_id,
        ];
    }
}
