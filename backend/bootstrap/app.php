<?php

use App\Http\Middleware\ApiAuth;
use App\Http\Middleware\BroadcastChanges;
use App\Http\Middleware\Cors;
use App\Http\Middleware\EnsureRestaurantFeature;
use App\Http\Middleware\EnsureSessionToken;
use App\Http\Middleware\EnsureSubscriptionAccess;
use App\Http\Middleware\PermissionAccess;
use App\Http\Middleware\RoleAccess;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(web: __DIR__.'/../routes/web.php', api: __DIR__.'/../routes/api.php', commands: __DIR__.'/../routes/console.php', health: '/up')
    // Realtime: POST /api/broadcasting/auth signs private channels for logged-in staff (docs/realtime.md).
    ->withBroadcasting(__DIR__.'/../routes/channels.php', ['prefix' => 'api', 'middleware' => ['api', 'api.auth']])
    ->withMiddleware(function (Middleware $middleware): void {
        // Render terminates TLS at its proxy; trust X-Forwarded-* so url()
        // produces https:// links (media, QR) instead of http://.
        $middleware->trustProxies(at: '*');
        $middleware->alias([
            'api.auth' => ApiAuth::class,
            'role' => RoleAccess::class,
            'permission' => PermissionAccess::class,
            'session.token' => EnsureSessionToken::class,
            'subscription' => EnsureSubscriptionAccess::class,
            'feature' => EnsureRestaurantFeature::class,
        ]);
        $middleware->append(Cors::class);
        // After a successful change, signal the screens that care (App\Support\Realtime).
        $middleware->appendToGroup('api', BroadcastChanges::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {})->create();
