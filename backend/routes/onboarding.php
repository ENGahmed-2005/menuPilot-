<?php

use App\Http\Controllers\FoundingPartnerController;
use App\Http\Controllers\RestaurantApplicationController;
use App\Http\Controllers\RestaurantContractController;
use Illuminate\Support\Facades\Route;

Route::post('applications', [RestaurantApplicationController::class, 'store'])->middleware('throttle:5,1');

Route::prefix('admin')->middleware(['api.auth', 'role:admin', 'permission:manage_admin'])->group(function () {
    Route::controller(RestaurantApplicationController::class)->prefix('applications')->group(function () {
        Route::get('/', 'index');
        Route::get('{id}', 'show')->whereNumber('id');
        Route::patch('{id}/status', 'status')->whereNumber('id');
        Route::post('{id}/notes', 'note')->whereNumber('id');
    });
    Route::controller(RestaurantContractController::class)->group(function () {
        Route::get('contract-templates', 'templates');
        Route::post('contract-templates', 'storeTemplate');
        Route::prefix('contracts')->group(function () {
            Route::get('/', 'index');
            Route::post('/', 'store');
            Route::get('{id}', 'show')->whereNumber('id');
            Route::put('{id}', 'update')->whereNumber('id');
            Route::post('{id}/generate-document', 'generate')->whereNumber('id');
            Route::post('{id}/upload-document', 'upload')->whereNumber('id')->middleware('throttle:20,1');
            Route::get('{id}/documents/{document}', 'download')->whereNumber(['id', 'document']);
            Route::post('{id}/record-signature', 'signature')->whereNumber('id');
            Route::post('{id}/verify-signatures', 'verify')->whereNumber('id');
            Route::post('{id}/activate', 'activate')->whereNumber('id');
            Route::post('{id}/resend-invitation', 'resendInvitation')->whereNumber('id')->middleware('throttle:5,1');
            Route::post('{id}/close', 'close')->whereNumber('id');
        });
    });
    Route::controller(FoundingPartnerController::class)->group(function () {
        Route::get('founding-partners', 'index');
        Route::post('founding-partners', 'store');
        Route::get('founding-partners/{id}', 'show')->whereNumber('id');
        Route::patch('founding-partners/{id}', 'update')->whereNumber('id');
        Route::get('founding-partner-settings', 'settings');
        Route::put('founding-partner-settings', 'saveSettings');
    });
});
