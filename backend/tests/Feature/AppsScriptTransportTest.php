<?php

use App\Mail\ResetPasswordLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function () {
    config([
        'mail.default' => 'appsscript',
        'mail.mailers.appsscript' => [
            'transport' => 'appsscript',
            'url' => 'https://script.google.com/macros/s/AKfycbTEST/exec',
            'secret' => 'relay-test-secret',
        ],
        'mail.from' => ['address' => 'ignored@example.com', 'name' => 'menuPilot'],
    ]);
});

it('sends the reset e-mail through the Apps Script relay with the shared secret', function () {
    Http::fake(['script.google.com/*' => Http::response(['ok' => true])]);

    Mail::to('owner@example.com')->send(new ResetPasswordLink('Ahmed', 'https://app.test/reset-password?token=abc'));

    Http::assertSent(function (Request $req) {
        $body = $req->data();

        return $req->url() === 'https://script.google.com/macros/s/AKfycbTEST/exec'
            && $body['secret'] === 'relay-test-secret'
            && $body['to'] === 'owner@example.com'
            && $body['name'] === 'menuPilot'
            && str_contains($body['subject'], 'menuPilot')
            && str_contains($body['html'], 'https://app.test/reset-password?token=abc');
    });
});

it('sends one request per recipient so addresses stay private', function () {
    Http::fake(['script.google.com/*' => Http::response(['ok' => true])]);

    Mail::raw('hello', fn ($m) => $m->to('a@example.com')->bcc('b@example.com')->subject('Hi'));

    Http::assertSentCount(2);
    Http::assertSent(fn (Request $req) => $req->data()['to'] === 'a@example.com');
    Http::assertSent(fn (Request $req) => $req->data()['to'] === 'b@example.com');
});

it('reports a script error clearly from the test command', function () {
    Http::fake(['script.google.com/*' => Http::response(['ok' => false, 'error' => 'unauthorized'])]);

    $this->artisan('menupilot:test-mail', ['to' => 'someone@example.com'])
        ->expectsOutputToContain('Apps Script: unauthorized')
        ->assertFailed();
});

it('explains a non-JSON answer such as the Google sign-in page', function () {
    Http::fake(['script.google.com/*' => Http::response('<html>Sign in</html>', 200)]);

    $this->artisan('menupilot:test-mail', ['to' => 'someone@example.com'])
        ->expectsOutputToContain('access "Anyone"')
        ->assertFailed();
});

it('fails fast when the relay is not configured', function () {
    config(['mail.mailers.appsscript.url' => '', 'mail.mailers.appsscript.secret' => '']);
    Http::fake();

    $this->artisan('menupilot:test-mail', ['to' => 'someone@example.com'])
        ->expectsOutputToContain('APPS_SCRIPT_MAIL_URL or APPS_SCRIPT_MAIL_SECRET is not set')
        ->assertFailed();

    Http::assertNothingSent();
});
