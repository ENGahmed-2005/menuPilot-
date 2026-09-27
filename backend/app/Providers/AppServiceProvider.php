<?php

namespace App\Providers;

use App\Mail\Transport\MailerSendTransport;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // MAIL_MAILER=mailersend → MailerSend API (token from MAILERSEND_API_KEY).
        Mail::extend('mailersend', fn (array $config) => new MailerSendTransport((string) ($config['key'] ?? '')));

        //
    }
}
