<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AccountingController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\BrandingController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\MenuCategoryController;
use App\Http\Controllers\MenuController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\OutsideOrderController;
use App\Http\Controllers\OwnerReportsController;
use App\Http\Controllers\PasswordRequestController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\StaffController;
use App\Http\Controllers\SubscriptionPaymentController;
use App\Http\Controllers\TableController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');
    Route::middleware('api.auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
    });
});

Route::get('public/tables/{code}/menu', [MenuController::class, 'publicMenu']);
// SRS-compatible public QR menu endpoint. Alias of the table-code menu route.
Route::get('menu/{table_token}', [MenuController::class, 'publicMenu']);
// New table sessions stop in restricted mode (trial ended / subscription stopped).
Route::post('public/tables/{code}/sessions', [SessionController::class, 'open'])->middleware('subscription:table');
// Customer (no login) session endpoints. They require the session secret
// issued when the QR session opens (X-Session-Token header, or ?token= for SSE).
Route::middleware('session.token')->group(function () {
    Route::get('public/sessions/{id}', [SessionController::class, 'show']);
    Route::patch('public/sessions/{id}/customer', [SessionController::class, 'updateCustomer']);
    Route::get('public/sessions/{id}/orders', [OrderController::class, 'session']);
    // US-10: submit an order for an open dining session. SRS alias below.
    Route::post('public/sessions/{id}/orders', [OrderController::class, 'submit'])->middleware(['throttle:30,1', 'subscription:session']);
    Route::post('sessions/{id}/orders', [OrderController::class, 'submit'])->middleware(['throttle:30,1', 'subscription:session']);
    Route::get('public/sessions/{id}/orders/stream', [OrderController::class, 'stream']);
    Route::get('public/sessions/{id}/payment-options', [PaymentController::class, 'options']);
    Route::post('public/sessions/{id}/payment', [PaymentController::class, 'submit'])->middleware(['throttle:20,1', 'subscription:session']); // creates an order
    Route::post('public/sessions/{id}/assistance-requests', [SessionController::class, 'assistance'])->middleware('throttle:10,1');
    Route::post('public/sessions/{id}/bill-request', [BillingController::class, 'request'])->middleware('throttle:10,1');
    Route::post('public/sessions/{id}/leave', [SessionController::class, 'leave'])->middleware('throttle:10,1');
    // The guest's own itemised bill (read-only).
    Route::get('public/sessions/{id}/bill', [BillingController::class, 'customerBill']);
    // SRS-compatible aliases (US-11, US-16).
    Route::post('sessions/{id}/call-waiter', [SessionController::class, 'assistance'])->middleware('throttle:10,1');
    Route::post('sessions/{id}/request-bill', [BillingController::class, 'request'])->middleware('throttle:10,1');
});

// Ordering from outside the restaurant (pickup / delivery) — delivery add-on.
Route::get('public/restaurants/{slug}', [OutsideOrderController::class, 'restaurant'])->where('slug', '[a-z0-9-]+');
Route::post('public/restaurants/{slug}/orders', [OutsideOrderController::class, 'place'])->where('slug', '[a-z0-9-]+')->middleware('throttle:10,1');
Route::get('public/outside-orders/{id}', [OutsideOrderController::class, 'track'])->middleware('throttle:60,1');

// Uploaded images (stored in the database so they survive redeploys).
Route::get('media/{uuid}', [MediaController::class, 'show'])->where('uuid', '[0-9a-fA-F-]{36}');

// ─────────────────────────────────────────────────────────────────────────
// Authenticated API. Authorization is permission-based (App\Support\Permissions):
// admin → everything, owner → everything in their restaurant, staff → role
// defaults or the custom list saved by the owner. Controllers additionally
// scope every query to the authenticated user's restaurant.
// ─────────────────────────────────────────────────────────────────────────
Route::middleware('api.auth')->group(function () {
    Route::get('permissions', [PermissionController::class, 'catalog']);

    Route::middleware('permission:manage_menu')->group(function () {
        // Reading the menu stays open; changing it is operational.
        Route::get('menu-items', [MenuController::class, 'index']);
        Route::get('menu-categories', [MenuCategoryController::class, 'index']);
        Route::middleware('subscription')->group(function () {
            Route::apiResource('menu-items', MenuController::class)->except(['show', 'create', 'index']);
            Route::apiResource('menu-categories', MenuCategoryController::class)->except(['show', 'create', 'index']);
        });
    });
    Route::middleware('permission:manage_tables')->group(function () {
        Route::middleware('subscription')->group(function () {
            Route::apiResource('tables', TableController::class)->except(['show', 'create', 'index']);
            Route::get('tables/{id}/qr', [TableController::class, 'qr']);
            Route::patch('tables/{id}/status', [TableController::class, 'updateStatus']);
        });
    });
    Route::middleware('permission:manage_staff')->group(function () {
        // Adding staff is operational; editing / disabling existing staff stays open.
        Route::post('staff', [StaffController::class, 'store'])->middleware('subscription');
        Route::apiResource('staff', StaffController::class)->except(['show', 'create', 'store']);
        Route::patch('staff/{id}/status', [StaffController::class, 'status']);
    });
    Route::middleware('permission:view_tables')->group(function () {
        Route::get('tables', [TableController::class, 'index']);
        Route::get('tables/{id}/status', [TableController::class, 'status']);
    });
    Route::middleware('permission:view_tables|view_orders')->group(function () {
        Route::get('sessions', [SessionController::class, 'active']);
        Route::get('sessions/stream', [SessionController::class, 'stream']);
    });
    Route::middleware('permission:view_orders')->group(function () {
        Route::get('owner/orders', [OrderController::class, 'owner']);
        Route::get('owner/orders/{id}', [OrderController::class, 'show']);
    });
    Route::middleware('permission:handle_assistance')->group(function () {
        // US-11: staff resolve waiter calls.
        Route::patch('assistance-requests/{id}/resolve', [SessionController::class, 'resolveAssistance']);
        Route::post('sessions/{id}/assistance/resolve', [SessionController::class, 'resolveSessionAssistance']);
    });
    Route::middleware('permission:manage_orders')->group(function () {
        Route::get('kitchen/orders', [OrderController::class, 'kitchen']);
        Route::patch('kitchen/orders/{id}/status', [OrderController::class, 'status']);
        // Same action for the owner's orders screen.
        Route::patch('orders/{id}/status', [OrderController::class, 'status']);
    });
    Route::post('orders/{id}/cancel', [OrderController::class, 'cancelOrder'])->middleware('permission:cancel_orders');
    // US-19 / US-20: waiters and cashiers cancel/reassign without approval.
    Route::post('order-items/{id}/cancel', [OrderController::class, 'cancel'])->middleware('permission:cancel_orders');

    // Outside orders inbox (pickup / delivery).
    Route::get('outside-orders', [OutsideOrderController::class, 'index'])->middleware('permission:view_orders|deliver_orders|dispatch_deliveries');
    // Assigning delivery orders to drivers.
    Route::get('outside-orders/drivers', [OutsideOrderController::class, 'drivers'])->middleware('permission:dispatch_deliveries|manage_orders|view_payments');
    Route::post('outside-orders/{id}/assign', [OutsideOrderController::class, 'assign'])->middleware(['permission:dispatch_deliveries|manage_orders|view_payments', 'subscription']);
    Route::middleware(['permission:manage_orders|view_payments', 'subscription'])->group(function () {
        Route::post('outside-orders/{id}/accept', [OutsideOrderController::class, 'accept']);
        Route::post('outside-orders/{id}/reject', [OutsideOrderController::class, 'reject']);
        Route::post('outside-orders/{id}/verify-payment', [OutsideOrderController::class, 'verifyPayment']);
    });
    // Out for delivery / completed: also allowed for delivery drivers (checked per order in the controller).
    Route::middleware(['permission:manage_orders|view_payments|deliver_orders|dispatch_deliveries', 'subscription'])->group(function () {
        Route::post('outside-orders/{id}/dispatch', [OutsideOrderController::class, 'dispatch']);
        Route::post('outside-orders/{id}/complete', [OutsideOrderController::class, 'complete']);
    });
    // Owner override of a delivery order's status (checked in the controller).
    Route::post('outside-orders/{id}/status', [OutsideOrderController::class, 'overrideStatus'])->middleware(['permission:view_orders', 'subscription']);
    Route::get('online-ordering/settings', [OutsideOrderController::class, 'settings'])->middleware('permission:manage_settings');
    Route::put('online-ordering/settings', [OutsideOrderController::class, 'updateSettings'])->middleware('permission:manage_settings');
    Route::post('order-items/{id}/reassign', [OrderController::class, 'reassign'])->middleware('permission:reassign_orders');

    // Billing and payments (US-16..18).
    Route::get('payments/pending', [PaymentController::class, 'pending'])->middleware('permission:view_payments');
    Route::post('payments/{id}/verify', [PaymentController::class, 'verify'])->middleware(['permission:verify_payments', 'throttle:30,1']);
    Route::post('payments/{id}/reject', [PaymentController::class, 'reject'])->middleware(['permission:verify_payments', 'throttle:30,1']);
    Route::post('payments/{id}/reconcile', [BillingController::class, 'reconcile'])->middleware(['permission:verify_payments', 'throttle:30,1']);
    Route::post('sessions/{id}/payment', [BillingController::class, 'pay'])->middleware(['permission:record_payment', 'throttle:30,1']);
    Route::patch('sessions/{sessionId}/bill-items/{item}', [BillingController::class, 'adjust'])->middleware(['permission:adjust_bill', 'throttle:30,1']);
    Route::get('sessions/{id}/bill', [BillingController::class, 'bill'])->middleware('permission:view_payments|view_tables');
    // Closing a dining session is its own permission (owner, manager, cashier by default).
    Route::post('sessions/{id}/close', [BillingController::class, 'close'])->middleware(['permission:close_session', 'throttle:20,1']);

    // Accounting & Excel export (docs/ACCOUNTING_EXPORT.md).
    Route::get('accounting/settings', [AccountingController::class, 'settings'])->middleware('permission:export_reports|export_invoices|export_payments|export_sales|manage_accounting_settings');
    Route::put('accounting/settings', [AccountingController::class, 'updateSettings'])->middleware('permission:manage_accounting_settings');
    Route::get('reports/export/invoices', [AccountingController::class, 'export'])->defaults('type', 'invoices')->middleware(['permission:export_invoices|export_reports', 'throttle:20,1']);
    Route::get('reports/export/sales', [AccountingController::class, 'export'])->defaults('type', 'sales')->middleware(['permission:export_sales|export_invoices|export_reports', 'throttle:20,1']);
    Route::get('reports/export/payments', [AccountingController::class, 'export'])->defaults('type', 'payments')->middleware(['permission:export_payments|export_reports', 'throttle:20,1']);
    Route::get('reports/export/products', [AccountingController::class, 'export'])->defaults('type', 'products')->middleware(['permission:export_sales|export_reports', 'throttle:20,1']);
    Route::get('reports/export/daily', [AccountingController::class, 'export'])->defaults('type', 'daily')->middleware(['permission:export_sales|export_reports', 'throttle:20,1']);

    // Owner account: these endpoints act on the owner's own user row, so they
    // stay owner-only on top of the permission check.
    Route::middleware('role:owner')->group(function () {
        Route::get('me/restaurant', [AccountController::class, 'show'])->middleware('permission:manage_restaurant');
        Route::patch('me/restaurant', [AccountController::class, 'updateRestaurant'])->middleware('permission:manage_restaurant');
        Route::patch('me/plan', [AccountController::class, 'plan'])->middleware('permission:manage_subscription');
        // Paying for a plan by bank transfer (never gated by the subscription itself).
        Route::get('subscription', [SubscriptionPaymentController::class, 'show'])->middleware('permission:manage_subscription');
        Route::post('subscription/payments', [SubscriptionPaymentController::class, 'store'])->middleware(['permission:manage_subscription', 'throttle:10,1']);
        Route::patch('me/theme', [AccountController::class, 'theme'])->middleware('permission:manage_branding');
        Route::get('me/branding', [BrandingController::class, 'show'])->middleware('permission:manage_branding');
        Route::post('me/branding', [BrandingController::class, 'update'])->middleware('permission:manage_branding');
        Route::post('me/branding/reset', [BrandingController::class, 'reset'])->middleware('permission:manage_branding');
        Route::get('owner/reports/sales-trend', [OwnerReportsController::class, 'salesTrend'])->middleware('permission:view_reports');
        Route::get('owner/audit-logs', [AuditLogController::class, 'owner'])->middleware('permission:manage_staff');
    });

    // Platform admin: role AND permission; any other role gets 403.
    Route::middleware(['role:admin', 'permission:manage_admin'])->group(function () {
        Route::get('admin/restaurants', [AdminController::class, 'restaurants']);
        Route::post('admin/restaurants', [AdminController::class, 'storeRestaurant']);
        Route::patch('admin/restaurants/{id}', [AdminController::class, 'updateOwner']);
        Route::delete('admin/restaurants/{id}', [AdminController::class, 'destroyRestaurant']);
        Route::get('admin/reports', [AdminController::class, 'reports']);
        Route::patch('admin/restaurants/{id}/plan', [AdminController::class, 'plan']);
        Route::post('admin/restaurants/{id}/trial/extend', [AdminController::class, 'extendTrial']);
        Route::post('admin/restaurants/{id}/subscription/cancel', [AdminController::class, 'cancelSubscription']);
        // Owners' forgot-password requests (link sent by the admin on WhatsApp).
        Route::get('admin/password-requests', [PasswordRequestController::class, 'index']);
        Route::post('admin/password-requests/{id}/link', [PasswordRequestController::class, 'link']);
        Route::post('admin/password-requests/{id}/dismiss', [PasswordRequestController::class, 'dismiss']);
        Route::get('admin/subscription-payments', [SubscriptionPaymentController::class, 'adminIndex']);
        Route::post('admin/subscription-payments/{id}/verify', [SubscriptionPaymentController::class, 'verify']);
        Route::post('admin/subscription-payments/{id}/reject', [SubscriptionPaymentController::class, 'reject']);
        Route::patch('admin/owners/{id}', [AdminController::class, 'updateOwner']);
        Route::patch('admin/owners/{id}/status', [AdminController::class, 'ownerStatus']);
        Route::get('admin/audit-logs', [AuditLogController::class, 'admin']);
    });
});
