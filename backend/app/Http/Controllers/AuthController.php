<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Str;
use Throwable;

class AuthController extends Controller
{
    private function out($data, $status = 200)
    {
        return response()->json(['data' => $data], $status);
    }

    private function otpConfigured(): bool
    {
        return filled(env('RESEND_API_KEY')) && filled(env('RESEND_FROM_EMAIL'));
    }

    private function sendEmailOtp(User $user): void
    {
        if (! $this->otpConfigured()) {
            throw new \RuntimeException('خدمة البريد الإلكتروني غير مهيأة على الخادم.');
        }

        $code = (string) random_int(100000, 999999);
        $user->update([
            'email_otp_hash' => hash('sha256', $code),
            'email_otp_expires_at' => now()->addMinutes(10),
            'email_otp_sent_at' => now(),
            'email_otp_attempts' => 0,
        ]);

        $fromName = env('RESEND_FROM_NAME', 'menuPilot');
        $response = Http::withToken(env('RESEND_API_KEY'))
            ->acceptJson()
            ->timeout(10)
            ->post('https://api.resend.com/emails', [
                'from' => $fromName.' <'.env('RESEND_FROM_EMAIL').'>',
                'to' => [$user->email],
                'subject' => 'رمز التحقق من حسابك في menuPilot',
                'html' => '<div style="font-family:Arial,sans-serif;line-height:1.8;max-width:560px;margin:auto;padding:24px"><h2>تأكيد حسابك في menuPilot</h2><p>استخدم رمز التحقق التالي لإكمال إنشاء حسابك:</p><div style="font-size:32px;font-weight:800;letter-spacing:8px;padding:18px;background:#f3efe5;border-radius:14px;text-align:center">'.$code.'</div><p>ينتهي الرمز خلال 10 دقائق.</p><p style="color:#777">إذا لم تطلب إنشاء هذا الحساب، تجاهل هذه الرسالة.</p></div>',
            ]);

        if (! $response->successful()) {
            $user->update([
                'email_otp_hash' => null,
                'email_otp_expires_at' => null,
                'email_otp_sent_at' => null,
            ]);
            throw new \RuntimeException($response->json('message') ?: 'تعذر إرسال رمز التحقق إلى البريد الإلكتروني.');
        }
    }

    private function verificationStatus(User $user): array
    {
        return [
            'required' => (bool) $user->verification_required,
            'email' => (bool) $user->email_verified_at,
            'complete' => ! $user->verification_required || (bool) $user->email_verified_at,
        ];
    }

    public function register(Request $r)
    {
        $email = Str::lower(trim((string) $r->input('email')));

        $v = Validator::make(array_merge($r->all(), ['email' => $email]), [
            'restaurant_name' => 'required|string|max:255',
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()],
        ])->validate();

        if (User::whereRaw('LOWER(email) = ?', [$email])->exists()) {
            return response()->json(['message' => 'This email address is already in use.'], 422);
        }

        if (! $this->otpConfigured()) {
            return response()->json(['message' => 'خدمة البريد الإلكتروني OTP غير مهيأة على الخادم.', 'code' => 'OTP_NOT_CONFIGURED'], 503);
        }

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
            'api_token' => null,
            'verification_required' => true,
            'login_failed_attempts' => 0,
            'login_locked_until' => null,
        ]);

        try {
            $this->sendEmailOtp($u);
        } catch (Throwable $e) {
            $u->delete();
            return response()->json(['message' => $e->getMessage(), 'code' => 'OTP_SEND_FAILED'], 503);
        }

        return $this->out([
            'user' => $u,
            'verification' => $this->verificationStatus($u),
            'requires_verification' => true,
        ], 201);
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
                    $u->update(['login_failed_attempts' => 0, 'login_locked_until' => now()->addMinutes(15)]);
                    return response()->json(['message' => 'Account temporarily locked. Try again in 15 minutes.'], 429);
                }
                $u->update(['login_failed_attempts' => $attempts]);
            }
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        if ($u->verification_required && ! $u->email_verified_at) {
            return response()->json([
                'message' => 'يجب تأكيد البريد الإلكتروني قبل تسجيل الدخول.',
                'code' => 'VERIFICATION_REQUIRED',
            ], 403);
        }

        if ($u->login_locked_until) $u->update(['login_locked_until' => null]);

        if ($u->role !== 'owner' && $u->role !== 'admin') {
            $staff = Staff::where('account_user_id', $u->id)->first();
            if (! $staff || ! $staff->active || $staff->role !== $u->role) {
                return response()->json(['message' => 'This staff account is disabled or not linked to a restaurant.'], 403);
            }
        }

        $u->refreshSubscriptionStatus();
        $u->update(['login_failed_attempts' => 0, 'login_locked_until' => null]);
        return $this->out(['token' => $this->issueToken($u, $r), 'user' => $u]);
    }

    private function issueToken(User $user, Request $request): string
    {
        $token = Str::random(60);
        DB::table('api_tokens')->insert([
            'user_id' => $user->id,
            'token_hash' => hash('sha256', $token),
            'user_agent' => Str::limit((string) $request->userAgent(), 500, ''),
            'ip_address' => $request->ip(),
            'last_used_at' => now(),
            'expires_at' => now()->addDays(30),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $user->update(['api_token' => hash('sha256', $token)]);
        return $token;
    }

    public function verifyStatus(Request $r)
    {
        $email = Str::lower(trim((string) $r->input('email')));
        $u = User::whereRaw('LOWER(email) = ?', [$email])->first();
        if (! $u) return response()->json(['message' => 'الحساب غير موجود.'], 404);

        return $this->out([
            'verification' => $this->verificationStatus($u),
            'email' => $u->email,
        ]);
    }

    public function sendVerificationCode(Request $r)
    {
        $v = $r->validate(['email' => 'required|email']);
        $u = User::whereRaw('LOWER(email) = ?', [Str::lower($v['email'])])->first();
        if (! $u) return response()->json(['message' => 'الحساب غير موجود.'], 404);
        if ($u->email_verified_at) return $this->out(['message' => 'البريد الإلكتروني مؤكد بالفعل.']);

        if ($u->email_otp_sent_at && now()->diffInSeconds($u->email_otp_sent_at) < 60) {
            return response()->json(['message' => 'انتظر دقيقة قبل طلب رمز جديد.'], 429);
        }

        try {
            $this->sendEmailOtp($u);
            return $this->out(['message' => 'تم إرسال رمز التحقق إلى بريدك الإلكتروني.']);
        } catch (Throwable $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'OTP_SEND_FAILED'], 503);
        }
    }

    public function verifyCode(Request $r)
    {
        $v = $r->validate([
            'email' => 'required|email',
            'code' => 'required|digits:6',
        ]);

        $u = User::whereRaw('LOWER(email) = ?', [Str::lower($v['email'])])->first();
        if (! $u) return response()->json(['message' => 'الحساب غير موجود.'], 404);
        if ($u->email_verified_at) return $this->out(['message' => 'البريد الإلكتروني مؤكد بالفعل.', 'verification' => $this->verificationStatus($u)]);

        if (! $u->email_otp_hash || ! $u->email_otp_expires_at || now()->gt($u->email_otp_expires_at)) {
            return response()->json(['message' => 'رمز التحقق منتهي الصلاحية. اطلب رمزًا جديدًا.'], 422);
        }

        if ((int) $u->email_otp_attempts >= 5) {
            return response()->json(['message' => 'تم تجاوز عدد المحاولات. اطلب رمزًا جديدًا.'], 429);
        }

        if (! hash_equals($u->email_otp_hash, hash('sha256', $v['code']))) {
            $u->increment('email_otp_attempts');
            return response()->json(['message' => 'رمز التحقق غير صحيح.'], 422);
        }

        $u->update([
            'email_verified_at' => now(),
            'email_otp_hash' => null,
            'email_otp_expires_at' => null,
            'email_otp_sent_at' => null,
            'email_otp_attempts' => 0,
        ]);
        $u->refresh();

        $response = [
            'message' => 'تم تأكيد البريد الإلكتروني بنجاح.',
            'verification' => $this->verificationStatus($u),
            'token' => $this->issueToken($u, $r),
            'user' => $u,
        ];

        return $this->out($response);
    }

    public function logout(Request $r)
    {
        if ($r->bearerToken()) {
            DB::table('api_tokens')->where('token_hash', hash('sha256', trim($r->bearerToken())))->delete();
        }
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
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $v['email']],
            ['token' => hash('sha256', $token), 'created_at' => now()]
        );
        return $this->out(['message' => 'Reset token created', 'reset_token' => $token]);
    }

    public function resetPassword(Request $r)
    {
        $v = $r->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()],
        ]);
        $row = DB::table('password_reset_tokens')->where('email', $v['email'])->first();
        if (! $row || ! hash_equals($row->token, hash('sha256', $v['token']))) {
            return response()->json(['message' => 'Invalid reset token.'], 422);
        }
        $user = User::where('email', $v['email'])->first();
        User::where('email', $v['email'])->update([
            'password' => Hash::make($v['password']),
            'api_token' => null,
            'login_failed_attempts' => 0,
            'login_locked_until' => null,
        ]);
        DB::table('api_tokens')->where('user_id', $user?->id)->delete();
        DB::table('password_reset_tokens')->where('email', $v['email'])->delete();
        return $this->out(['message' => 'Password reset successfully']);
    }
}
