<?php

use App\Http\Middleware\ApiAuth;
use App\Http\Middleware\Cors;
use App\Http\Middleware\EnsureSessionToken;
use App\Http\Middleware\PermissionAccess;
use App\Http\Middleware\RoleAccess;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(web: __DIR__.'/../routes/web.php', api: __DIR__.'/../routes/api.php', commands: __DIR__.'/../routes/console.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware): void {
        // Render terminates TLS at its proxy; trust X-Forwarded-* so url()
        // produces https:// links (media, QR) instead of http://.
        $middleware->trustProxies(at: '*');
        $middleware->alias([
            'api.auth' => ApiAuth::class,
            'role' => RoleAccess::class,
            'permission' => PermissionAccess::class,
            'session.token' => EnsureSessionToken::class,
        ]);
        $middleware->append(Cors::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {})->create();
