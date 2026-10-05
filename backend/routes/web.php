<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
| The MenuPilot frontend is a separate React application, so the business
| API routes live in routes/api.php. This file keeps only the Laravel web
| entry point and a simple health page for the backend.
*/

Route::get('/', function () {
    return response()->json([
        'app' => config('app.name', 'MenuPilot'),
        'status' => 'ok',
        'message' => 'MenuPilot backend is running',
    ]);
});

// Used by Render and scripts/smoke-test.mjs. Checks the database too, so a
// refused MySQL connection shows up as 503 instead of a false "ok". Never
// includes connection details or error text in the response.
Route::get('/health', function () {
    try {
        DB::select('select 1');
        $database = 'ok';
    } catch (Throwable $e) {
        Log::error('health: database unavailable', ['error' => $e->getMessage()]);
        $database = 'unavailable';
    }

    return response()->json([
        'status' => $database === 'ok' ? 'ok' : 'degraded',
        'service' => 'backend',
        'database' => $database,
    ], $database === 'ok' ? 200 : 503);
});
