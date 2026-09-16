<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    private function out($data, $status = 200)
    {
        return response()->json(['data' => $data], $status);
    }

    public function register(Request $r)
    {
        $email = Str::lower(trim((string) $r->input('email')));

        $v = Validator::make(array_merge($r->all(), ['email' => $email]), [
            'restaurant_name' => 'required|string|max:255',
            'email' => ['required', 'email', function ($attribute, $value, $fail) {
                if (User::whereRaw('LOWER(email) = ?', [Str::lower($value)])->exists()) {
                    $fail('This email address is already in use.');
                }
            }],
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()],
        ]);
        $v = $v->validate();

        $token = Str::random(60);
        $now = now();
        $u = User::create([
            'name' => $v['restaurant_name'],
            'restaurant_name' => $v['restaurant_name'],
            'email' => $email,
            'password' => Hash::make($v['password']),
            'plan' => 'trial',
            'trial_started_at' => $now,
            'trial_ends_at' => $now->copy()->addDays(14),
            'role' => 'owner',
            'api_token' => hash('sha256', $token),
            'login_failed_attempts' => 0,
            'login_locked_until' => null,
        ]);

        return $this->out(['token' => $token, 'user' => $u], 201);
    }

    public function login(Request $r)
    {
        $v = $r->validate(['email' => 'required|email', 'password' => 'required']);
        $email = Str::lower(trim($v['email']));
        $u = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if ($u && $u->login_locked_until && now()->lt($u->login_locked_until)) {
            return response()->json(['message' => 'Account temporarily locked. Try again in 15 minutes.'], 429);
        }

        if (! $u || ! Hash::check($v['password'], $u->password)) {
            if ($u) {
                $attempts = ((int) $u->login_failed_attempts) + 1;
                if ($attempts >= 5) {
                    $u->update([
                        'login_failed_attempts' => 0,
                        'login_locked_until' => now()->addMinutes(15),
                    ]);
                    return response()->json(['message' => 'Account temporarily locked. Try again in 15 minutes.'], 429);
                }
                $u->update(['login_failed_attempts' => $attempts]);
            }
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        if ($u->login_locked_until) {
            $u->update(['login_locked_until' => null]);
        }
        if ($u->role !== 'owner' && $u->role !== 'admin') {
            $staff = Staff::where('account_user_id', $u->id)->first();
            if (! $staff || ! $staff->active || $staff->role !== $u->role) {
                return response()->json(['message' => 'This staff account is disabled or not linked to a restaurant.'], 403);
            }
        }
        $u->refreshSubscriptionStatus();
        $token = Str::random(60);
        $u->update([
            'api_token' => hash('sha256', $token),
            'login_failed_attempts' => 0,
            'login_locked_until' => null,
        ]);

        return $this->out(['token' => $token, 'user' => $u]);
    }

    public function logout(Request $r)
    {
        $r->user()->update(['api_token' => null]);

        return $this->out(['message' => 'Logged out']);
    }

    public function me(Request $r)
    {
        $u = $r->user();
        $u->refreshSubscriptionStatus();

        return $this->out($u->load('restaurantSetting'));
    }

    public function forgotPassword(Request $r)
    {
        $v = $r->validate(['email' => 'required|email']);
        $token = Str::random(64);
        DB::table('password_reset_tokens')->updateOrInsert(['email' => $v['email']], ['token' => hash('sha256', $token), 'created_at' => now()]);

        return $this->out(['message' => 'Reset token created', 'reset_token' => $token]);
    }

    public function resetPassword(Request $r)
    {
        $v = $r->validate(['token' => 'required', 'email' => 'required|email', 'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()]]);
        $row = DB::table('password_reset_tokens')->where('email', $v['email'])->first();
        if (! $row || ! hash_equals($row->token, hash('sha256', $v['token']))) {
            return response()->json(['message' => 'Invalid reset token.'], 422);
        }
        User::where('email', $v['email'])->update(['password' => Hash::make($v['password']), 'api_token' => null, 'login_failed_attempts' => 0, 'login_locked_until' => null]);
        DB::table('password_reset_tokens')->where('email', $v['email'])->delete();

        return $this->out(['message' => 'Password reset successfully']);
    }
}
