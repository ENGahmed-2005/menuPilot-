<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * php artisan menupilot:test-mail you@example.com
 *
 * Sends one test e-mail through the configured mailer and prints the exact
 * error if it fails (wrong host/port, bad credentials, unverified sender).
 * Never prints the SMTP password.
 */
class TestMail extends Command
{
    protected $signature = 'menupilot:test-mail {to : Recipient address}';

    protected $description = 'Send a test e-mail to verify the MAIL_* settings.';

    public function handle(): int
    {
        $to = (string) $this->argument('to');
        $mailer = config('mail.default');
        $smtp = config('mail.mailers.smtp');

        $this->line("Mailer : {$mailer}");
        if ($mailer === 'mailersend') {
            $key = (string) config('mail.mailers.mailersend.key');
            $this->line('API    : MailerSend ('.($key ? substr($key, 0, 9).'…' : 'MAILERSEND_API_KEY missing').')');
        }
        if ($mailer === 'smtp') {
            $this->line("Host   : {$smtp['host']}:{$smtp['port']} (".($smtp['scheme'] ?? $smtp['encryption'] ?? 'auto').')');
            $this->line('User   : '.($smtp['username'] ?: '(none)'));
        }
        $this->line('From   : '.config('mail.from.address'));

        try {
            Mail::raw("اختبار بريد menuPilot.\nإذا وصلتك هذه الرسالة فإعدادات البريد تعمل.", function ($m) use ($to) {
                $m->to($to)->subject('اختبار البريد — menuPilot');
            });
        } catch (\Throwable $e) {
            $this->error('فشل الإرسال: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info($mailer === 'log' ? 'MAIL_MAILER=log: الرسالة كُتبت في storage/logs/laravel.log ولم تُرسل فعليًا.' : "أُرسلت الرسالة إلى {$to}. افحص صندوق الوارد والبريد المزعج.");

        return self::SUCCESS;
    }
}
