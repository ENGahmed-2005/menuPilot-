<?php

namespace App\Providers;

use App\Broadcasting\PusherProtocolBroadcaster;
use App\Mail\Transport\MailerSendTransport;
use Illuminate\Support\Facades\Broadcast;
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
        // BROADCAST_CONNECTION=realtime → a Pusher-protocol server such as Laravel Reverb (docs/realtime.md).
        Broadcast::extend('pusher-protocol', fn ($app, array $config) => new PusherProtocolBroadcaster($config));

        // MAIL_MAILER=mailersend → MailerSend API (token from MAILERSEND_API_KEY).
        Mail::extend('mailersend', fn (array $config) => new MailerSendTransport((string) ($config['key'] ?? '')));

        //
    }
}
