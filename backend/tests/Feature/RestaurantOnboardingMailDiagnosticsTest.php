<?php

use App\Support\RestaurantOnboarding;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

it('logs useful SMTP failure details without exposing credentials', function () {
    config([
        'mail.default' => 'smtp',
        'mail.mailers.smtp.host' => 'smtp-relay.brevo.com',
        'mail.mailers.smtp.port' => 587,
        'mail.mailers.smtp.scheme' => 'smtp',
        'mail.mailers.smtp.password' => 'smtp-top-secret',
    ]);

    Mail::shouldReceive('raw')
        ->once()
        ->andThrow(new RuntimeException(
            'SMTP authentication failed for smtp://smtp-user:smtp-top-secret@smtp-relay.brevo.com:587; password=smtp-top-secret'
        ));

    Log::shouldReceive('warning')
        ->once()
        ->with('MenuPilot onboarding email could not be delivered.', Mockery::on(function (array $context): bool {
            expect($context['mailer'])->toBe('smtp');
            expect($context['smtp_host'])->toBe('smtp-relay.brevo.com');
            expect($context['smtp_port'])->toBe(587);
            expect($context['smtp_scheme'])->toBe('smtp');
            expect($context['exception_class'])->toBe(RuntimeException::class);
            expect($context['exception_message'])->toContain('[REDACTED]');
            expect($context['exception_message'])->not->toContain('smtp-top-secret');
            expect($context['exception_message'])->not->toContain('smtp-user');

            return true;
        }));

    RestaurantOnboarding::notify('owner@example.test', 'MenuPilot application update', 'Test message');
});
