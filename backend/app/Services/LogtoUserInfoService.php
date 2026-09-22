<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class LogtoUserInfoService
{
    public function getUser(string $accessToken): array
    {
        $response = Http::acceptJson()
            ->withToken($accessToken)
            ->timeout(10)
            ->get((string) config('services.logto.userinfo_uri'));

        if (!$response->successful()) {
            throw new RuntimeException('Invalid or expired Logto access token.');
        }

        $user = $response->json();
        if (!is_array($user) || empty($user['sub'])) {
            throw new RuntimeException('Logto user information is invalid.');
        }

        return $user;
    }
}
