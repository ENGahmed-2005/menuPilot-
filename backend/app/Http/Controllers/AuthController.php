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

    private function twilioConfigured(): bool
    {
        return filled(env('TWILIO_ACCOUNT_SID'))
            && filled(env('TWILIO_AUTH_TOKEN'))
            && filled(env('TWILIO_VERIFY_SERVICE_SID'));
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

    private function sendVerification(User $user, string $channel): void
    {
        if (! $this->twilioConfigured()) {
            throw new \RuntimeException('OTP service is not configured.');
        }

        $to = $channel === 'email' ? $user->email : $user->whatsapp_phone;
        $response = Http::asForm()
            ->withBasicAuth(env('TWILIO_ACCOUNT_SID'), env('TWILIO_AUTH_TOKEN'))
            ->timeout(8)
            ->post('https://verify.twilio.com/v2/Services/'.env('TWILIO_VERIFY_SERVICE_SID').'/Verifications', [
                'To' => $to,
                'Channel' => $channel === 'whatsapp' ? 'whatsapp' : 'email',
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException($response->json('message') ?: 'تعذر إرسال رمز التحقق.');
        }
    }

    private function checkVerification(string $to, string $code): bool
    {
        if (! $this->twilioConfigured()) throw new \RuntimeException('OTP service is not configured.');

        $response = Http::asForm()
            ->withBasicAuth(env('TWILIO_ACCOUNT_SID'), env('TWILIO_AUTH_TOKEN'))
            ->timeout(8)
            ->post('https://verify.twilio.com/v2/Services/'.env('TWILIO_VERIFY_SERVICE_SID').'/VerificationCheck', [
                'To' => $to,
                'Code' => $code,
            ]);

        return $response->successful() && $response->json('status') === 'approved';
    }

    private function verificationStatus(User $user): array
    {
        return [
            'required' => (bool) $user->verification_required,
            'email' => (bool) $user->email_verified_at,
            'whatsapp' => (bool) $user->whatsapp_verified_at,
            'complete' => ! $user->verification_required || ($user->email_verified_at && $user->whatsapp_verified_at),
        ];
    }

    public function register(Request $r)
    {
        $email = Str::lower(trim((string) $r->input('email')));
        $phone = trim((string) $r->input('whatsapp_phone'));

        $v = Validator::make(array_merge($r->all(), ['email' => $email, 'whatsapp_phone' => $phone]), [
            'restaurant_name' => 'required|string|max:255',
            'email' => ['required', 'email'],
            'whatsapp_phone' => ['required', 'regex:/^\+[1-9]\d{7,14}$/'],
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()],
        ])->validate();

        if (User::whereRaw('LOWER(email) = ?', [$email])->exists()) return response()->json(['message' => 'This email address is already in use.'], 422);
        if (User::where('whatsapp_phone', $phone)->exists()) return response()->json(['message' => 'رقم WhatsApp مستخدم مسبقًا.'], 422);
        if (! $this->twilioConfigured()) return response()->json(['message' => 'خدمة OTP غير مهيأة على الخادم.', 'code' => 'OTP_NOT_CONFIGURED'], 503);

        $now = now();
        $u = User::create([
            'name' => $v['restaurant_name'],
            'restaurant_name' => $v['restaurant_name'],
            'email' => $email,
            'whatsapp_phone' => $phone,
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
            $this->sendVerification($u, 'email');
            $this->sendVerification($u, 'whatsapp');
        } catch (Throwable $e) {
            $u->delete();
            return response()->json(['message' => $e->getMessage(), 'code' => 'OTP_SEND_FAILED'], 503);
        }

        return $this->out(['user' => $u, 'verification' => $this->verificationStatus($u), 'requires_verification' => true], 201);
    }

    public function login(Request $r)
    {
        $v = $r->validate(['email' => 'required|email', 'password' => 'required']);
        $email = Str::lower(trim($v['email']));
        $u = User::whereRaw('LOWER(email) = ?', [$email])->first();

        if ($u && $u->login_locked_until && now()->lt($u->login_locked_until)) return response()->json(['message' => 'Account temporarily locked. Try again in 15 minutes.'], 429);

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

        if ($u->verification_required && (! $u->email_verified_at || ! $u->whatsapp_verified_at)) {
            return response()->json(['message' => 'يجب تأكيد البريد الإلكتروني وWhatsApp قبل تسجيل الدخول.', 'code' => 'VERIFICATION_REQUIRED'], 403);
        }

        if ($u->login_locked_until) $u->update(['login_locked_until' => null]);

        if ($u->role !== 'owner' && $u->role !== 'admin') {
            $staff = Staff::where('account_user_id', $u->id)->first();
            if (! $staff || ! $staff->active || $staff->role !== $u->role) return response()->json(['message' => 'This staff account is disabled or not linked to a restaurant.'], 403);
        }

        $u->refreshSubscriptionStatus();
        $u->update(['login_failed_attempts' => 0, 'login_locked_until' => null]);
        return $this->out(['token' => $this->issueToken($u, $r), 'user' => $u]);
    }

    public function verifyStatus(Request $r)
    {
        $email = Str::lower(trim((string) $r->input('email')));
        $u = User::whereRaw('LOWER(email) = ?', [$email])->first();
        if (! $u) return response()->json(['message' => 'الحساب غير موجود.'], 404);
        return $this->out(['verification' => $this->verificationStatus($u), 'email' => $u->email, 'whatsapp_phone' => $u->whatsapp_phone]);
    }

    public function sendVerificationCode(Request $r)
    {
        $v = $r->validate(['email' => 'required|email', 'channel' => 'required|in:email,whatsapp']);
        $u = User::whereRaw('LOWER(email) = ?', [Str::lower($v['email'])])->first();
        if (! $u) return response()->json(['message' => 'الحساب غير موجود.'], 404);
        if ($v['channel'] === 'email' && $u->email_verified_at) return $this->out(['message' => 'البريد الإلكتروني مؤكد بالفعل.']);
        if ($v['channel'] === 'whatsapp' && $u->whatsapp_verified_at) return $this->out(['message' => 'رقم WhatsApp مؤكد بالفعل.']);

        try {
            $this->sendVerification($u, $v['channel']);
            return $this->out(['message' => 'تم إرسال رمز التحقق.']);
        } catch (Throwable $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'OTP_SEND_FAILED'], 503);
        }
    }

    public function verifyCode(Request $r)
    {
        $v = $r->validate(['email' => 'required|email', 'channel' => 'required|in:email,whatsapp', 'code' => 'required|digits:6']);
        $u = User::whereRaw('LOWER(email) = ?', [Str::lower($v['email'])])->first();
        if (! $u) return response()->json(['message' => 'الحساب غير موجود.'], 404);
        $to = $v['channel'] === 'email' ? $u->email : $u->whatsapp_phone;

        try {
            if (! $this->checkVerification($to, $v['code'])) return response()->json(['message' => 'رمز التحقق غير صحيح أو منتهي الصلاحية.'], 422);
        } catch (Throwable $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'OTP_CHECK_FAILED'], 503);
        }

        $u->update([$v['channel'] === 'email' ? 'email_verified_at' : 'whatsapp_verified_at' => now()]);
        $u->refresh();
        $verification = $this->verificationStatus($u);
        $response = ['message' => 'تم تأكيد الرمز بنجاح.', 'verification' => $verification];

        if ($verification['complete']) {
            $response['token'] = $this->issueToken($u, $r);
            $response['user'] = $u;
        }
        return $this->out($response);
    }

    public function logout(Request $r)
    {
        if ($r->bearerToken()) DB::table('api_tokens')->where('token_hash', hash('sha256', trim($r->bearerToken())))->delete();
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
        if (! $row || ! hash_equals($row->token, hash('sha256', $v['token']))) return response()->json(['message' => 'Invalid reset token.'], 422);
        User::where('email', $v['email'])->update(['password' => Hash::make($v['password']), 'api_token' => null, 'login_failed_attempts' => 0, 'login_locked_until' => null]);
        if (DB::getSchemaBuilder()->hasTable('api_tokens')) DB::table('api_tokens')->where('user_id', User::where('email', $v['email'])->value('id'))->delete();
        DB::table('password_reset_tokens')->where('email', $v['email'])->delete();
        return $this->out(['message' => 'Password reset successfully']);
    }
}