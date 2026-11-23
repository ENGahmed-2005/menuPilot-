<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

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

    /**
     * Remove credentials and common secret formats before writing transport errors to application logs.
     */
    private static function sanitizeMailError(string $message): string
    {
        $secrets = [
            config('mail.mailers.smtp.password'),
            config('mail.mailers.mailersend.key'),
            config('mail.mailers.appsscript.secret'),
            config('mail.mailers.appsscript.endpoint'),
        ];

        foreach ($secrets as $secret) {
            if (is_string($secret) && $secret !== '') {
                $message = str_replace($secret, '[REDACTED]', $message);
            }
        }

        $message = preg_replace('/(authorization\s*:\s*)(?:basic|bearer)\s+\S+/i', '$1[REDACTED]', $message) ?? $message;
        $message = preg_replace('/(:\/\/)[^\/\s@]+@/', '$1[REDACTED]@', $message) ?? $message;
        $message = preg_replace(
            '/\b(password|passwd|secret|token|api[_-]?key)\b(\s*[=:]\s*|\s+)(?:"[^"]*"|\'[^\']*\'|[^\s,;]+)/i',
            '$1$2[REDACTED]',
            $message
        ) ?? $message;

        return substr($message, 0, 1000);
    }

    public static function inviteOwner(User $owner, ?int $id = null): void
    {
        $token = Str::random(64);
        DB::table('password_reset_tokens')->updateOrInsert(['email' => $owner->email], [
            'token' => hash('sha256', $token), 'created_at' => now(), 'owner_invitation' => true,
        ]);
        $url = rtrim(config('app.frontend_url'), '/').'/reset-password?'.http_build_query(['token' => $token, 'email' => $owner->email]);
        self::notify($owner->email, 'Set your MenuPilot password', "Your restaurant is active. Set your password using this one-time link:\n".$url, 'contract_events', $id);
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
            } catch (Throwable $exception) {
                $result = 'mail_failed';
                $mailer = (string) config('mail.default', 'unknown');
                $smtp = config('mail.mailers.smtp', []);

                logger()->warning('MenuPilot onboarding email could not be delivered.', [
                    'subject' => $subject,
                    'mailer' => $mailer,
                    'smtp_host' => $smtp['host'] ?? null,
                    'smtp_port' => $smtp['port'] ?? null,
                    'smtp_scheme' => $smtp['scheme'] ?? null,
                    'exception_class' => $exception::class,
                    'exception_message' => self::sanitizeMailError($exception->getMessage()),
                ]);
            }
            if ($eventTable && $recordId) {
                try {
                    self::event($eventTable, $recordId, $result, description: $subject);
                } catch (Throwable $exception) {
                    logger()->warning('MenuPilot notification outcome could not be recorded.', [
                        'result' => $result,
                        'exception_class' => $exception::class,
                    ]);
                }
            }
        });
    }
}
