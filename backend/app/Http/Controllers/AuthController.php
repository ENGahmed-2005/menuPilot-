<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\AuthSessions;
use App\Support\CredentialAccount;
use App\Support\Permissions;
use App\Support\SubscriptionAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

/**
 * Account endpoints that stay in Laravel. Signing in, sessions, 2FA, Google,
 * e-mail verification and e-mail password resets belong to the Better Auth
 * service (auth/); Laravel creates restaurants (register), answers "who am
 * I" from the session, and keeps the admin's WhatsApp reset-link flow.
 */
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

        // Owner, restaurant and free trial are created together or not at all.
        // Trial dates come from config/subscriptions.php; request values
        // (plan, trial_ends_at, status…) are ignored. No token: the app signs
        // in through the auth service (after verifying the e-mail when it asks).
        $u = DB::transaction(function () use ($v, $email) {
            $u = User::create([
                'name' => $v['restaurant_name'],
                'restaurant_name' => $v['restaurant_name'],
                'email' => $email,
                'password' => Hash::make($v['password']),
                'role' => 'owner',
                'login_failed_attempts' => 0,
                'login_locked_until' => null,
            ]);
            CredentialAccount::sync($u->id, $u->password);
            SubscriptionAccess::startTrial($u);

            return $u->fresh();
        });
        $u->setAttribute('permissions', Permissions::for($u));
        $u->setAttribute('subscription', SubscriptionAccess::for($u)->toArray());

        return $this->out(['user' => $u], 201);
    }

    /**
     * Sign-in moved to the auth service (POST /api/auth/sign-in/email through
     * the app's own origin). An app cached from before still posts here.
     */
    public function login()
    {
        return response()->json([
            'message' => 'تم تحديث طريقة تسجيل الدخول. حدّث الصفحة أو التطبيق ثم سجّل الدخول من جديد.',
            'code' => 'USE_NEW_LOGIN',
        ], 410);
    }

    /**
     * Only the shared demo accounts still hold a legacy token; real sessions
     * end through the auth service (sign-out), which deletes the session row.
     */
    public function logout(Request $r)
    {
        if (AuthSessions::resolve($r)['via'] === 'legacy') {
            $r->user()->update(['api_token' => null]);
        }

        return $this->out(['message' => 'Logged out']);
    }

    public function me(Request $r)
    {
        $u = $r->user();
        $u->refreshSubscriptionStatus();

        $u->load('restaurantSetting');
        // Shown on the Security page (Better Auth keeps them up to date).
        $u->setAttribute('two_factor_enabled', (bool) $u->two_factor_enabled);
        $u->setAttribute('email_verified', (bool) $u->email_verified);
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
        $user = User::where('email', $v['email'])->first();
        if ($user) {
            $hash = Hash::make($v['password']);
            $user->forceFill(['password' => $hash, 'api_token' => null, 'login_failed_attempts' => 0, 'login_locked_until' => null])->save();
            CredentialAccount::sync($user->id, $hash);
            // A new password signs every device out.
            AuthSessions::revokeFor($user->id);
        }
        DB::table('password_reset_tokens')->where('email', $v['email'])->delete();

        return $this->out(['message' => 'Password reset successfully']);
    }
}
