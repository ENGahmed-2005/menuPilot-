<?php

use App\Broadcasting\PusherProtocolBroadcaster;
use App\Events\RealtimeSignal;
use App\Support\Realtime;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

/** Realtime signals over the Pusher protocol (Laravel Reverb), docs/realtime.md. */
function useRealtime(): void
{
    config(['broadcasting.default' => 'realtime', 'broadcasting.connections.realtime' => [
        'driver' => 'pusher-protocol', 'key' => 'app-key', 'secret' => 'app-secret', 'app_id' => 'app-1',
        'host' => 'reverb.test', 'port' => 8080, 'scheme' => 'http', 'timeout' => 2,
    ]]);
    // Channels register on the broadcaster chosen at boot ("null" in tests): register them on this one too.
    require base_path('routes/channels.php');
}

it('signs like the Pusher HTTP API documents', function () {
    // The worked example from Pusher's REST API docs.
    $body = '{"name":"foo","channels":["project-3"],"data":"{\"some\":\"data\"}"}';
    $q = PusherProtocolBroadcaster::signedQuery('POST', '/apps/3/events', $body, '278d425bdf160c739803', '7ad3773142a6692b25b8', 1353088179);
    expect($q['body_md5'])->toBe('ec365a775a4cd0599faeb73354201b6f')
        ->and($q['auth_signature'])->toBe('da454824c97ba181a32ccc17a72625ba02771f50b50e1e7430e47a1f3f457e6c');
});

it('publishes a signal to the server, and a failed publish never throws', function () {
    useRealtime();
    Http::fake(['reverb.test:8080/*' => Http::response('{}', 200)]);
    Broadcast::connection('realtime')->broadcast(['private-restaurant.5'], 'signal', ['topic' => 'orders']);
    Http::assertSent(function ($request) {
        parse_str(parse_url($request->url(), PHP_URL_QUERY), $q);
        $expected = PusherProtocolBroadcaster::signedQuery('POST', '/apps/app-1/events', $request->body(), 'app-key', 'app-secret', (int) $q['auth_timestamp']);

        return str_starts_with($request->url(), 'http://reverb.test:8080/apps/app-1/events?')
            && $q['auth_signature'] === $expected['auth_signature']
            && $request['name'] === 'signal' && $request['channels'] === ['private-restaurant.5']
            && json_decode($request['data'], true) === ['topic' => 'orders'];
    });

    Http::fake(['reverb.test:8080/*' => Http::response('down', 500)]);
    Broadcast::connection('realtime')->broadcast(['private-restaurant.5'], 'signal', ['topic' => 'orders']);
    expect(true)->toBeTrue(); // reached: the failure was logged, not thrown
});

it('lets only the restaurant’s owner and staff into its private channel', function () {
    useRealtime();
    $owner = makeOwner('A');
    $other = makeOwner('B');
    $staff = makeStaff($owner['id'], 'kitchen');
    $theirStaff = makeStaff($other['id'], 'kitchen');
    $auth = fn (array $who, ?string $channel = null, string $socket = '1234.5678') => $this->postJson('/api/broadcasting/auth', ['socket_id' => $socket, 'channel_name' => $channel ?? "private-restaurant.{$owner['id']}"], authAs($who));

    $signed = 'app-key:'.hash_hmac('sha256', "1234.5678:private-restaurant.{$owner['id']}", 'app-secret');
    $auth($owner)->assertOk()->assertJsonPath('auth', $signed);
    $auth($staff)->assertOk()->assertJsonPath('auth', $signed);
    $auth($other)->assertForbidden();
    $auth($theirStaff)->assertForbidden();
    $auth($owner, null, 'not-a-socket')->assertForbidden();
    $this->postJson('/api/broadcasting/auth', ['socket_id' => '1.2', 'channel_name' => "private-restaurant.{$owner['id']}"])->assertUnauthorized();
});

it('signals the restaurant and the guest’s session after changes, only when they succeed', function () {
    useRealtime();
    Event::fake([RealtimeSignal::class]);
    $owner = makeOwner('Live');
    DB::table('users')->where('id', $owner['id'])->update(['payment_timing' => 'after']);
    $table = makeTable($owner['id']);
    $item = makeItem($owner['id'], 20);
    $session = openSession($this, $table);
    $sid = (int) $session['id'];
    $sent = fn () => collect(Event::dispatched(RealtimeSignal::class))->map(fn ($e) => [$e[0]->channel, $e[0]->topic])->unique()->values()->all();

    expect($sent())->toContain(["restaurant.{$owner['id']}", 'tables']); // the table was opened

    Event::fake([RealtimeSignal::class]);
    $this->postJson("/api/public/sessions/{$sid}/orders", ['items' => [['menuItemId' => $item, 'quantity' => 1]]], customer($session))->assertSuccessful();
    expect($sent())->toContain(["restaurant.{$owner['id']}", 'orders'], ["restaurant.{$owner['id']}", 'tables'], [Realtime::sessionChannel($sid), 'session']);

    // The kitchen moves the order: the guest's tracking hears about it.
    Event::fake([RealtimeSignal::class]);
    $orderId = (int) DB::table('orders')->where('dining_session_id', $sid)->value('id');
    $this->patchJson("/api/kitchen/orders/{$orderId}/status", ['status' => 'preparing'], authAs($owner))->assertOk();
    expect($sent())->toContain([Realtime::sessionChannel($sid), 'session'], ["restaurant.{$owner['id']}", 'orders']);

    // Reads and refused changes send nothing.
    Event::fake([RealtimeSignal::class]);
    $this->getJson("/api/public/sessions/{$sid}/orders", customer($session))->assertOk();
    $this->patchJson("/api/kitchen/orders/{$orderId}/status", ['status' => 'teleported'], authAs($owner))->assertStatus(422);
    Event::assertNotDispatched(RealtimeSignal::class);
});

it('stays quiet until a realtime server is configured', function () {
    config(['broadcasting.default' => 'null']);
    Event::fake([RealtimeSignal::class]);
    $owner = makeOwner('Quiet');
    openSession($this, makeTable($owner['id']));
    Event::assertNotDispatched(RealtimeSignal::class);
});

it('hands out the channels only with what they belong to', function () {
    $owner = makeOwner('Ch');
    $session = openSession($this, makeTable($owner['id']));
    $this->getJson("/api/public/sessions/{$session['id']}", customer($session))->assertOk()
        ->assertJsonPath('data.realtime_channel', Realtime::sessionChannel((int) $session['id']));
    expect(Realtime::sessionChannel(1))->not->toBe(Realtime::sessionChannel(2))->toStartWith('session.')->toHaveLength(48);

    $staff = makeStaff($owner['id'], 'cashier');
    // Staff get the restaurant's id (for its channel) with their own profile.
    $this->getJson('/api/auth/me', authAs($staff))->assertOk()->assertJsonPath('data.subscription.owner_id', $owner['id']);
});
