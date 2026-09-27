<?php

use App\Mail\ResetPasswordLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function () {
    config([
        'mail.default' => 'mailersend',
        'mail.mailers.mailersend' => ['transport' => 'mailersend', 'key' => 'mlsn.test-key'],
        'mail.from' => ['address' => 'noreply@test-abc.mlsender.net', 'name' => 'menuPilot'],
    ]);
});

it('sends the reset e-mail through the MailerSend API with the token', function () {
    Http::fake(['api.mailersend.com/*' => Http::response('', 202)]);

    Mail::to('owner@example.com')->send(new ResetPasswordLink('Ahmed', 'https://app.test/reset-password?token=abc'));

    Http::assertSent(function (Request $req) {
        $body = $req->data();

        return $req->url() === 'https://api.mailersend.com/v1/email'
            && $req->hasHeader('Authorization', 'Bearer mlsn.test-key')
            && $body['from'] === ['email' => 'noreply@test-abc.mlsender.net', 'name' => 'menuPilot']
            && $body['to'] === [['email' => 'owner@example.com']]
            && str_contains($body['subject'], 'menuPilot')
            && str_contains($body['html'], 'https://app.test/reset-password?token=abc');
    });
});

it('reports MailerSend errors clearly from the test command', function () {
    Http::fake(['api.mailersend.com/*' => Http::response(['message' => 'The from.email domain must be verified in your account.'], 422)]);

    $this->artisan('menupilot:test-mail', ['to' => 'someone@example.com'])
        ->expectsOutputToContain('MailerSend 422: The from.email domain must be verified')
        ->assertFailed();
});

it('sends plain-text mail (test command) successfully', function () {
    Http::fake(['api.mailersend.com/*' => Http::response('', 202)]);

    $this->artisan('menupilot:test-mail', ['to' => 'someone@example.com'])->assertSuccessful();
    Http::assertSent(fn (Request $req) => str_contains($req->data()['text'] ?? '', 'menuPilot'));
});
