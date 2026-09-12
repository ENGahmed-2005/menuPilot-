<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MenuController;
use App\Http\Controllers\TableController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\StaffController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\BrandingController;

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
Route::post('public/tables/{code}/sessions', [SessionController::class, 'open']);
Route::get('public/sessions/{id}', [SessionController::class, 'show']);
Route::patch('public/sessions/{id}/customer', [SessionController::class, 'updateCustomer']);
Route::get('public/sessions/{id}/orders', [OrderController::class, 'session']);
Route::get('public/sessions/{id}/orders/stream', [OrderController::class, 'stream']);
Route::get('public/sessions/{id}/payment-options', [PaymentController::class, 'options']);
Route::post('public/sessions/{id}/payment', [PaymentController::class, 'submit']);
Route::post('public/sessions/{id}/assistance-requests', [SessionController::class, 'assistance']);
Route::post('public/sessions/{id}/bill-request', [BillingController::class, 'request']);

Route::middleware('api.auth')->group(function () {
    Route::apiResource('menu-items', MenuController::class)->except(['show', 'create']);
    Route::apiResource('tables', TableController::class)->except(['show', 'create']);
    Route::get('tables/{id}/status', [TableController::class, 'status']);
    Route::get('sessions', [SessionController::class, 'active']);
    Route::get('sessions/stream', [SessionController::class, 'stream']);
    Route::get('kitchen/orders', [OrderController::class, 'kitchen']);
    Route::patch('kitchen/orders/{id}/status', [OrderController::class, 'status']);
    Route::get('owner/orders', [OrderController::class, 'owner']);
    Route::post('order-items/{id}/cancel', [OrderController::class, 'cancel']);
    Route::post('order-items/{id}/reassign', [OrderController::class, 'reassign']);
    Route::get('payments/pending', [PaymentController::class, 'pending']);
    Route::post('payments/{id}/verify', [PaymentController::class, 'verify']);
    Route::post('payments/{id}/reject', [PaymentController::class, 'reject']);
    Route::get('sessions/{id}/bill', [BillingController::class, 'bill']);
    Route::post('sessions/{id}/payment', [BillingController::class, 'pay']);
    Route::patch('sessions/{sessionId}/bill-items/{item}', [BillingController::class, 'adjust']);
    Route::apiResource('staff', StaffController::class)->except(['show', 'create']);
    Route::get('me/restaurant', [AccountController::class, 'show']);
    Route::patch('me/restaurant', [AccountController::class, 'updateRestaurant']);
    Route::patch('me/plan', [AccountController::class, 'plan']);
    Route::patch('me/theme', [AccountController::class, 'theme']);
    Route::get('me/branding', [BrandingController::class, 'show']);
    Route::post('me/branding', [BrandingController::class, 'update']);
    Route::post('me/branding/reset', [BrandingController::class, 'reset']);
    Route::get('admin/restaurants', [AdminController::class, 'restaurants']);
    Route::patch('admin/restaurants/{id}/plan', [AdminController::class, 'plan']);
    Route::post('admin/restaurants/{id}/trial/extend', [AdminController::class, 'extendTrial']);
});
