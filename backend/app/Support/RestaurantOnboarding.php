<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class RestaurantOnboarding
{
    public static function data(mixed $data, int $status = 200): JsonResponse
    {
        return response()->json(['data' => $data], $status, ['Cache-Control' => 'private, no-store']);
    }

    public static function contractForBilling(int $restaurantId): ?array
    {
        $contract = DB::table('contracts')->where('restaurant_id', $restaurantId)
            ->where('status', 'active')->where('end_date', '>=', today()->toDateString())
            ->latest('id')->first(['contract_number', 'end_date', 'terms']);
        if (! $contract) {
            return null;
        }
        $terms = json_decode($contract->terms, true, flags: JSON_THROW_ON_ERROR);

        return [
            'number' => $contract->contract_number, 'end_date' => $contract->end_date,
            'amount' => $terms['amount'], 'currency' => $terms['currency'], 'billing_cycle' => $terms['billing_cycle'],
        ];
    }

    public static function event(string $table, int $subject, string $type, ?string $old = null, ?string $new = null, ?string $description = null, array $metadata = []): void
    {
        DB::table($table)->insert([
            'subject_id' => $subject, 'actor_id' => request()->user()?->id,
            'event_type' => $type, 'old_status' => $old, 'new_status' => $new,
            'description' => $description, 'metadata' => json_encode($metadata, JSON_THROW_ON_ERROR),
            'created_at' => now(),
        ]);
    }

    public static function notify(string $email, string $subject, string $body, ?string $eventTable = null, ?int $recordId = null): void
    {
        DB::afterCommit(static function () use ($email, $subject, $body, $eventTable, $recordId) {
            $result = 'mail_disabled';
            try {
                if (config('mail.default') !== 'log') {
                    Mail::raw($body, fn ($message) => $message->to($email)->subject($subject));
                    $result = 'mail_sent';
                }
            } catch (\Throwable) {
                $result = 'mail_failed';
                logger()->warning('MenuPilot onboarding email could not be delivered.', ['subject' => $subject]);
            }
            if ($eventTable && $recordId) {
                try {
                    self::event($eventTable, $recordId, $result, description: $subject);
                } catch (\Throwable) {
                    logger()->warning('MenuPilot notification outcome could not be recorded.', ['result' => $result]);
                }
            }
        });
    }
}
