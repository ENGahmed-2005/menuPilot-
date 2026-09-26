<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\BrandingController;
use App\Http\Controllers\MenuCategoryController;
use App\Http\Controllers\MenuController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\OwnerReportsController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\StaffController;
use App\Http\Controllers\TableController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('reset-password', [AuthController::class, 'resetPassword']);
    Route::middleware('api.auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });
});

Route::get('public/tables/{code}/menu', [MenuController::class, 'publicMenu']);
// SRS-compatible public QR menu endpoint. Alias of the table-code menu route.
Route::get('menu/{table_token}', [MenuController::class, 'publicMenu']);
Route::post('public/tables/{code}/sessions', [SessionController::class, 'open']);
Route::get('public/sessions/{id}', [SessionController::class, 'show']);
Route::patch('public/sessions/{id}/customer', [SessionController::class, 'updateCustomer']);
Route::get('public/sessions/{id}/orders', [OrderController::class, 'session']);
// US-10: submit an order for an open dining session (no login). SRS alias below.
Route::post('public/sessions/{id}/orders', [OrderController::class, 'submit'])->middleware('throttle:30,1');
Route::post('sessions/{id}/orders', [OrderController::class, 'submit'])->middleware('throttle:30,1');
Route::get('public/sessions/{id}/orders/stream', [OrderController::class, 'stream']);
Route::get('public/sessions/{id}/payment-options', [PaymentController::class, 'options']);
Route::post('public/sessions/{id}/payment', [PaymentController::class, 'submit']);
Route::post('public/sessions/{id}/assistance-requests', [SessionController::class, 'assistance'])->middleware('throttle:10,1');
Route::post('public/sessions/{id}/bill-request', [BillingController::class, 'request'])->middleware('throttle:10,1');
// SRS-compatible aliases (US-11, US-16).
Route::post('sessions/{id}/call-waiter', [SessionController::class, 'assistance'])->middleware('throttle:10,1');
Route::post('sessions/{id}/request-bill', [BillingController::class, 'request'])->middleware('throttle:10,1');

Route::middleware('api.auth')->group(function () {
    Route::middleware('role:manager')->group(function () {
        Route::apiResource('menu-items', MenuController::class)->except(['show', 'create']);
        Route::apiResource('menu-categories', MenuCategoryController::class)->except(['show', 'create']);
        Route::apiResource('tables', TableController::class)->except(['show', 'create']);
        Route::get('tables/{id}/qr', [TableController::class, 'qr']);
        Route::apiResource('staff', StaffController::class)->except(['show', 'create']);
    });
    Route::middleware('role:manager,kitchen,cashier,waiter')->group(function () {
        Route::get('sessions', [SessionController::class, 'active']);
        Route::get('sessions/stream', [SessionController::class, 'stream']);
        Route::get('owner/orders', [OrderController::class, 'owner']);
        Route::get('owner/orders/{id}', [OrderController::class, 'show']);
    });
    Route::middleware('role:manager,waiter,cashier')->group(function () {
        // US-11: staff resolve waiter calls.
        Route::patch('assistance-requests/{id}/resolve', [SessionController::class, 'resolveAssistance']);
        Route::post('sessions/{id}/assistance/resolve', [SessionController::class, 'resolveSessionAssistance']);
    });
    Route::middleware('role:manager,kitchen')->group(function () {
        Route::get('kitchen/orders', [OrderController::class, 'kitchen']);
        Route::patch('kitchen/orders/{id}/status', [OrderController::class, 'status']);
    });
    // US-19 / US-20: waiters AND cashiers may cancel/reassign without approval.
    Route::middleware('role:manager,waiter,cashier')->group(function () {
        Route::post('order-items/{id}/cancel', [OrderController::class, 'cancel']);
        Route::post('order-items/{id}/reassign', [OrderController::class, 'reassign']);
    });
    Route::middleware('role:manager,cashier')->group(function () {
        Route::get('payments/pending', [PaymentController::class, 'pending']);
        Route::post('payments/{id}/verify', [PaymentController::class, 'verify'])->middleware('throttle:30,1');
        Route::post('payments/{id}/reject', [PaymentController::class, 'reject'])->middleware('throttle:30,1');
        Route::post('sessions/{id}/payment', [BillingController::class, 'pay'])->middleware('throttle:30,1');
        Route::post('sessions/{id}/close', [BillingController::class, 'close'])->middleware('throttle:20,1');
        Route::post('payments/{id}/reconcile', [BillingController::class, 'reconcile'])->middleware('throttle:30,1');
        Route::patch('sessions/{sessionId}/bill-items/{item}', [BillingController::class, 'adjust'])->middleware('throttle:30,1');
    });
    Route::middleware('role:manager,cashier,waiter')->group(function () {
        Route::get('sessions/{id}/bill', [BillingController::class, 'bill']);
    });
    Route::middleware('role:owner')->group(function () {
        Route::get('me/restaurant', [AccountController::class, 'show']);
        Route::patch('me/restaurant', [AccountController::class, 'updateRestaurant']);
        Route::patch('me/plan', [AccountController::class, 'plan']);
        Route::patch('me/theme', [AccountController::class, 'theme']);
        Route::get('me/branding', [BrandingController::class, 'show']);
        Route::post('me/branding', [BrandingController::class, 'update']);
        Route::post('me/branding/reset', [BrandingController::class, 'reset']);
        Route::get('owner/reports/sales-trend', [OwnerReportsController::class, 'salesTrend']);
    });
    Route::middleware('role:admin')->group(function () {
        Route::get('admin/restaurants', [AdminController::class, 'restaurants']);
        Route::get('admin/reports', [AdminController::class, 'reports']);
        Route::patch('admin/restaurants/{id}/plan', [AdminController::class, 'plan']);
        Route::post('admin/restaurants/{id}/trial/extend', [AdminController::class, 'extendTrial']);
        Route::patch('admin/owners/{id}', [AdminController::class, 'updateOwner']);
    });
});
