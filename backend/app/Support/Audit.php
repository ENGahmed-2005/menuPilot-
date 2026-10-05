<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Audit trail for sensitive actions (payments, price changes, session
 * closing, staff/role changes, admin actions). Never stores secrets:
 * password/token-like keys are stripped from metadata. Logging must never
 * break the business action, so failures are reported and swallowed.
 */
class Audit
{
    private const SECRET_KEYS = ['password', 'password_confirmation', 'api_token', 'token', 'secret', 'card', 'cvv'];

    public static function log(Request $request, string $action, string $entityType, $entityId = null, array $metadata = [], ?int $restaurantId = null): void
    {
        try {
            DB::table('audit_logs')->insert([
                'user_id' => $request->user()?->id,
                'restaurant_id' => $restaurantId,
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'metadata' => $metadata ? json_encode(Arr::except($metadata, self::SECRET_KEYS), JSON_UNESCAPED_UNICODE) : null,
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('audit log failed', ['action' => $action, 'error' => $e->getMessage()]);
        }
    }
}
