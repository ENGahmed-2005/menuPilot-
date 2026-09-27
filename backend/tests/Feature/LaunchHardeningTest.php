<?php

use App\Mail\ResetPasswordLink;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

/*
| Password reset: token only by e-mail
*/

it('never returns the reset token and e-mails a frontend link instead', function () {
    Mail::fake();
    config(['app.frontend_url' => 'https://app.menupilot.test']);
    $owner = makeOwner();
    $email = DB::table('users')->where('id', $owner['id'])->value('email');

    $res = $this->postJson('/api/auth/forgot-password', ['email' => $email])->assertOk();
    expect($res->json('data'))->not->toHaveKey('reset_token')->not->toHaveKey('_devResetToken');

    $link = null;
    Mail::assertSent(ResetPasswordLink::class, function ($mail) use ($email, &$link) {
        $link = $mail->link;

        return $mail->hasTo($email) && str_starts_with($mail->link, 'https://app.menupilot.test/reset-password?token=');
    });

    parse_str(parse_url($link, PHP_URL_QUERY), $q);
    $this->postJson('/api/auth/reset-password', ['token' => $q['token'], 'email' => $email, 'password' => 'N3w#Password', 'password_confirmation' => 'N3w#Password'])->assertOk();
    expect(Hash::check('N3w#Password', DB::table('users')->where('id', $owner['id'])->value('password')))->toBeTrue();
});

it('answers the same for unknown e-mails and rejects expired links', function () {
    Mail::fake();
    $unknown = $this->postJson('/api/auth/forgot-password', ['email' => 'nobody@nowhere.test'])->assertOk()->json('data.message');
    $owner = makeOwner();
    $email = DB::table('users')->where('id', $owner['id'])->value('email');
    $known = $this->postJson('/api/auth/forgot-password', ['email' => $email])->assertOk()->json('data.message');
    expect($unknown)->toBe($known);
    Mail::assertSent(ResetPasswordLink::class, 1);

    DB::table('password_reset_tokens')->updateOrInsert(['email' => $email], ['token' => hash('sha256', 'old-token'), 'created_at' => now()->subMinutes(61)]);
    $this->postJson('/api/auth/reset-password', ['token' => 'old-token', 'email' => $email, 'password' => 'N3w#Password', 'password_confirmation' => 'N3w#Password'])
        ->assertStatus(422)->assertJsonPath('code', 'RESET_TOKEN_EXPIRED');
});

/*
| Customer session secret
*/

it('requires the session secret on public session endpoints', function () {
    $owner = makeOwner();
    $s = openSession($this, makeTable($owner['id']));
    $item = makeItem($owner['id']);
    expect($s['access_token'])->toBeString()->toHaveLength(48);

    // Guessing another session's id is no longer enough.
    $this->getJson("/api/public/sessions/{$s['id']}")->assertForbidden()->assertJsonPath('code', 'SESSION_TOKEN_INVALID');
    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => $item, 'quantity' => 1]]], ['X-Session-Token' => 'wrong'])->assertForbidden();
    $this->postJson("/api/public/sessions/{$s['id']}/bill-request")->assertForbidden();

    $this->getJson("/api/public/sessions/{$s['id']}", customer($s))->assertOk();
    $this->postJson("/api/public/sessions/{$s['id']}/orders", ['items' => [['menuItemId' => $item, 'quantity' => 1]]], customer($s))->assertCreated();
    // EventSource can't send headers: ?token= works for GET.
    $this->getJson("/api/public/sessions/{$s['id']}/orders?token={$s['access_token']}")->assertOk();
});

it('gives the same secret to a second diner at the same table and hides it from staff', function () {
    $owner = makeOwner();
    $cashier = makeStaff($owner['id'], 'cashier');
    $table = makeTable($owner['id']);
    $first = openSession($this, $table, 'Sara');
    $second = openSession($this, $table, 'Omar');

    expect($second['access_token'])->toBe($first['access_token']);
    expect($this->getJson('/api/sessions', authAs($cashier))->json('data.0'))->not->toHaveKey('access_token');
});

/*
| QR codes and uploads
*/

it('builds QR codes from FRONTEND_URL, not the backend host', function () {
    config(['app.frontend_url' => 'https://app.menupilot.test']);
    $owner = makeOwner();
    $id = $this->postJson('/api/tables', ['label' => 'T1', 'seats' => 4], authAs($owner))->assertCreated()->json('data.id');
    $code = DB::table('restaurant_tables')->where('id', $id)->value('table_code');

    $table = $this->getJson('/api/tables', authAs($owner))->json('data.0');
    expect($table['menuUrl'])->toBe("https://app.menupilot.test/t/{$code}")
        ->and(urldecode($table['qrImageUrl']))->toContain("https://app.menupilot.test/t/{$code}");
    expect($this->getJson("/api/tables/{$id}/qr", authAs($owner))->json('data.menu_url'))->toBe("https://app.menupilot.test/t/{$code}");
});

it('stores uploaded images in the database and serves them', function () {
    $owner = makeOwner();
    // 1×1 transparent PNG (no GD needed).
    $png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    $item = $this->postJson('/api/menu-items', ['name' => 'Dish', 'price' => 12, 'imageUrl' => 'data:image/png;base64,'.$png], authAs($owner))->assertCreated()->json('data');

    expect($item['imageUrl'])->toContain('/api/media/');
    $uuid = basename(parse_url($item['imageUrl'], PHP_URL_PATH));
    $res = $this->get("/api/media/{$uuid}")->assertOk()->assertHeader('Content-Type', 'image/png');
    expect($res->headers->get('Cache-Control'))->toContain('immutable');
    expect(DB::table('media')->count())->toBe(1);
});
