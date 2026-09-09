<?php

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

Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'service' => 'backend',
    ]);
});
