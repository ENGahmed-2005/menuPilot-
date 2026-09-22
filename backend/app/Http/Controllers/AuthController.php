<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\LogtoJwtService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

class AuthController extends Controller
{
    private function out($data, int $status = 200)
    {
        return response()->json(['data' => $data], $status);
    }

    public function bootstrap(Request $request)
    {
        $validated = $request->validate([
            'access_token' => 'required|string',
            'id_claims' => 'required|array',
            'restaurant_name' => 'nullable|string|max:255',
            'restaurant_type' => 'nullable|string|max:100',
            'plan' => 'nullable|in:trial,basic,pro,premium',
        ]);

        try {
            $accessClaims = app(LogtoJwtService::class)->validate(
                $validated['access_token'],
                (string) config('services.logto.audience')
            );

            $subject = (string) ($accessClaims['sub'] ?? '');
            $idClaims = $validated['id_claims'];

            if ($subject === '' || ($idClaims['sub'] ?? null) !== $subject) {
                throw new RuntimeException('Logto identity mismatch.');
            }

            $email = Str::lower(trim((string) ($idClaims['email'] ?? '')));
            if ($email === '' || empty($idClaims['email_verified'])) {
                throw new RuntimeException('A verified Logto email is required.');
            }

            $user = User::where('logto_subject', $subject)->first();

            if (!$user) {
                $userByEmail = User::whereRaw('LOWER(email) = ?', [$email])->first();

                if ($userByEmail && $userByEmail->logto_subject && $userByEmail->logto_subject !== $subject) {
                    return response()->json(['message' => 'This email is already linked to another Logto account.'], 409);
                }

                $user = $userByEmail;
            }

            if (!$user) {
                $now = now();
                $user = User::create([
                    'name' => $idClaims['name'] ?? Str::before($email, '@'),
                    'restaurant_name' => $validated['restaurant_name'] ?: ($idClaims['name'] ?? 'مطعمي'),
                    'email' => $email,
                    'password' => Hash::make(Str::random(64)),
                    'plan' => $validated['plan'] ?: 'trial',
                    'trial_started_at' => $now,
                    'trial_ends_at' => $now->copy()->addDays(14),
                    'role' => 'owner',
                    'api_token' => null,
                    'logto_subject' => $subject,
                    'email_verified_at' => now(),
                    'login_failed_attempts' => 0,
                    'login_locked_until' => null,
                ]);
            } else {
                $updates = [];

                if (!$user->logto_subject) $updates['logto_subject'] = $subject;
                if (!$user->email_verified_at) $updates['email_verified_at'] = now();

                if (!$user->restaurant_name && !empty($validated['restaurant_name'])) {
                    $updates['restaurant_name'] = $validated['restaurant_name'];
                }

                if ($updates) $user->update($updates);
                $user->refresh();
            }

            $user->refreshSubscriptionStatus();

            return $this->out([
                'user' => $user->load('restaurantSetting'),
                'logto' => [
                    'subject' => $subject,
                    'email_verified' => true,
                ],
            ]);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage(), 'code' => 'LOGTO_BOOTSTRAP_FAILED'], 401);
        }
    }

    public function logout()
    {
        return $this->out(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->refreshSubscriptionStatus();

        return $this->out($user->load('restaurantSetting'));
    }
}
