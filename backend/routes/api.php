<?php
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\MenuController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\OrderItemController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\TableController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register',[AuthController::class,'register']);
Route::post('/auth/login',[AuthController::class,'login']);
Route::post('/auth/forgot-password',[AuthController::class,'forgotPassword']);
Route::post('/auth/reset-password',[AuthController::class,'resetPassword']);
Route::get('/public/tables/{tableCode}/menu',[MenuController::class,'publicMenu']);
Route::post('/public/tables/{tableCode}/sessions',[SessionController::class,'open']);
Route::get('/public/sessions/{sessionId}',[SessionController::class,'show']);
Route::get('/public/sessions/{sessionId}/orders',[OrderController::class,'sessionOrders']);
Route::post('/public/sessions/{sessionId}/orders',[OrderController::class,'store']);
Route::post('/public/sessions/{sessionId}/assistance',[SessionController::class,'assistance']);
Route::post('/public/sessions/{sessionId}/assistance-requests',[SessionController::class,'assistance']);
Route::post('/public/sessions/{sessionId}/bill-request',[BillingController::class,'requestBill']);

Route::middleware('auth:sanctum')->group(function(){
 Route::post('/auth/logout',[AuthController::class,'logout']); Route::get('/auth/me',[AuthController::class,'me']);
 Route::apiResource('categories',CategoryController::class)->except(['create','edit']); Route::get('/menu-items',[MenuController::class,'index']);
 Route::apiResource('products',ProductController::class)->except(['create','edit']); Route::apiResource('tables',TableController::class)->except(['show','create','edit']);
 Route::get('/tables/{id}/status',[TableController::class,'status']); Route::get('/sessions/active',[SessionController::class,'active']); Route::get('/sessions',[SessionController::class,'active']);
 Route::get('/kitchen/orders',[OrderController::class,'kitchen']); Route::patch('/kitchen/orders/{id}/status',[OrderController::class,'status']); Route::get('/owner/orders',[OrderController::class,'owner']);
 Route::get('/sessions/{sessionId}/bill',[BillingController::class,'show']); Route::post('/sessions/{sessionId}/payment',[BillingController::class,'payment']); Route::patch('/sessions/{sessionId}/bill-items/{billItemId}',[BillingController::class,'adjust']);
 Route::patch('/me/plan',[SubscriptionController::class,'changePlan']); Route::post('/order-items/{id}/cancel',[OrderItemController::class,'cancel']); Route::post('/order-items/{id}/reassign',[OrderItemController::class,'reassign']);
});
