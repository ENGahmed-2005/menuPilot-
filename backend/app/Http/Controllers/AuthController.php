<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Models\User;
use App\Support\Permissions;
use App\Support\SubscriptionAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

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
        // Owner, restaurant and free trial are created together or not at all.
        // Trial dates come from config/subscriptions.php; request values
        // (plan, trial_ends_at, status…) are ignored.
        $u = DB::transaction(function () use ($v, $email, $token) {
            $u = User::create([
                'name' => $v['restaurant_name'],
                'restaurant_name' => $v['restaurant_name'],
                'email' => $email,
                'password' => Hash::make($v['password']),
                'role' => 'owner',
                'api_token' => hash('sha256', $token),
                'login_failed_attempts' => 0,
                'login_locked_until' => null,
            ]);
            SubscriptionAccess::startTrial($u);

            return $u->fresh();
        });
        $u->setAttribute('permissions', Permissions::for($u));
        $u->setAttribute('subscription', SubscriptionAccess::for($u)->toArray());

        return $this->out(['token' => $token, 'user' => $u], 201);
    }

    public function login(Request $r)
    {
        $v = $r->validate(['email' => 'required|email', 'password' => 'required']);
        $email = Str::lower(trim($v['email']));
        $u = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if ($u && $u->login_locked_until && now()->lt($u->login_locked_until)) {
            return response()->json(['message' => 'تم إيقاف الدخول مؤقتًا بعد عدة محاولات خاطئة. حاول مجددًا بعد 15 دقيقة، أو استخدم «نسيت كلمة المرور».'], 429);
        }

        if (! $u || ! Hash::check($v['password'], $u->password)) {
            if ($u) {
                $attempts = ((int) $u->login_failed_attempts) + 1;
                if ($attempts >= 5) {
                    $u->update([
                        'login_failed_attempts' => 0,
                        'login_locked_until' => now()->addMinutes(15),
                    ]);

                    return response()->json(['message' => 'تم إيقاف الدخول مؤقتًا بعد عدة محاولات خاطئة. حاول مجددًا بعد 15 دقيقة، أو استخدم «نسيت كلمة المرور».'], 429);
                }
                $u->update(['login_failed_attempts' => $attempts]);
            }

            return response()->json(['message' => 'البريد الإلكتروني أو كلمة المرور غير صحيحة. تأكد منهما وحاول مجددًا.', 'code' => 'INVALID_CREDENTIALS'], 422);
        }

        if ($u->login_locked_until) {
            $u->update(['login_locked_until' => null]);
        }
        if ($u->is_active === false) {
            return response()->json(['message' => 'تم تعطيل هذا الحساب. تواصل مع إدارة المنصة.', 'code' => 'ACCOUNT_DISABLED'], 403);
        }
        if ($u->role !== 'owner' && $u->role !== 'admin') {
            $staff = Staff::where('account_user_id', $u->id)->first();
            if (! $staff || ! $staff->active || $staff->role !== $u->role) {
                return response()->json(['message' => 'حساب الموظف هذا موقوف أو غير مرتبط بمطعم. تواصل مع صاحب المطعم.', 'code' => 'ACCOUNT_DISABLED'], 403);
            }
            if (User::where('id', $staff->user_id)->value('is_active') === false) {
                return response()->json(['message' => 'حساب هذا المطعم موقوف. تواصل مع إدارة المنصة.', 'code' => 'ACCOUNT_DISABLED'], 403);
            }
        }
        $u->refreshSubscriptionStatus();
        $token = Str::random(60);
        $u->update([
            'api_token' => hash('sha256', $token),
            'login_failed_attempts' => 0,
            'login_locked_until' => null,
        ]);

        $u->setAttribute('permissions', Permissions::for($u));
        $u->setAttribute('subscription', SubscriptionAccess::for($u)->sync()->toArray());

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

        $u->load('restaurantSetting');
        // The frontend mirrors these to hide actions; the API enforces them.
        $u->setAttribute('permissions', Permissions::for($u));
        // Server-computed trial/subscription state (the UI never computes it).
        $u->setAttribute('subscription', SubscriptionAccess::for($u)->sync()->toArray());

        return $this->out($u);
    }

    public function forgotPassword(Request $r)
    {
        $v = $r->validate(['email' => 'required|email']);
        $email = Str::lower(trim($v['email']));
        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

        // Restaurant owners: the request goes to the platform admin, who sends a
        // one-time reset link on WhatsApp. Staff passwords are changed by their
        // restaurant owner. No token is ever returned here, and the answer is
        // the same whether or not the e-mail exists (no account enumeration).
        if ($user && $user->is_active !== false && $user->role === 'owner') {
            $pending = DB::table('password_reset_requests')->where('user_id', $user->id)->where('status', 'pending')->first();
            if ($pending) {
                DB::table('password_reset_requests')->where('id', $pending->id)->update(['updated_at' => now(), 'ip' => $r->ip()]);
            } else {
                DB::table('password_reset_requests')->insert(['user_id' => $user->id, 'status' => 'pending', 'ip' => $r->ip(), 'created_at' => now(), 'updated_at' => now()]);
            }
        }

        return $this->out(['message' => 'استلمنا طلبك. سيتواصل معك فريق menuPilot على رقم واتساب المطعم ويرسل لك رابط إعادة التعيين. إذا كنت موظفًا، اطلب من صاحب المطعم تغيير كلمة مرورك.']);
    }

    public function resetPassword(Request $r)
    {
        $v = $r->validate(['token' => 'required', 'email' => 'required|email', 'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()]]);
        $row = DB::table('password_reset_tokens')->where('email', $v['email'])->first();
        if (! $row || ! hash_equals($row->token, hash('sha256', $v['token']))) {
            return response()->json(['message' => 'رابط إعادة التعيين غير صالح.', 'code' => 'RESET_TOKEN_INVALID'], 422);
        }
        if (now()->diffInMinutes($row->created_at, true) > 60) {
            DB::table('password_reset_tokens')->where('email', $v['email'])->delete();

            return response()->json(['message' => 'انتهت صلاحية رابط إعادة التعيين. اطلب رابطًا جديدًا.', 'code' => 'RESET_TOKEN_EXPIRED'], 422);
        }
        User::where('email', $v['email'])->update(['password' => Hash::make($v['password']), 'api_token' => null, 'login_failed_attempts' => 0, 'login_locked_until' => null]);
        DB::table('password_reset_tokens')->where('email', $v['email'])->delete();

        return $this->out(['message' => 'Password reset successfully']);
    }
}
