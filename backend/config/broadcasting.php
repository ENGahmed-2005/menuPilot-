<?php

/*
 * Realtime updates (App\Support\Realtime). The app publishes small signals
 * over the Pusher protocol, which Laravel Reverb speaks; screens refetch
 * their data when a signal arrives. Until a Reverb server is configured,
 * leave BROADCAST_CONNECTION as "null" (or "log"): nothing is published and
 * the screens keep refreshing on a timer. Setup: docs/realtime.md.
 */
return [
    'default' => env('BROADCAST_CONNECTION', 'null'),

    'connections' => [
        // Any Pusher-protocol server: Laravel Reverb (recommended), Soketi, or Pusher Channels.
        'realtime' => [
            'driver' => 'pusher-protocol',
            'key' => env('REVERB_APP_KEY'),
            'secret' => env('REVERB_APP_SECRET'),
            'app_id' => env('REVERB_APP_ID'),
            // Where the backend reaches Reverb's HTTP API (often a private/internal address).
            'host' => env('REVERB_SERVER_HOST', env('REVERB_HOST', '127.0.0.1')),
            'port' => (int) env('REVERB_SERVER_PORT', env('REVERB_PORT', 8080)),
            'scheme' => env('REVERB_SERVER_SCHEME', env('REVERB_SCHEME', 'http')),
            'timeout' => (float) env('REVERB_TIMEOUT', 2),
        ],
        'log' => ['driver' => 'log'],
        'null' => ['driver' => 'null'],
    ],
];
