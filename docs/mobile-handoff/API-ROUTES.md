# Laravel API — جرد كامل من route:list

يشمل aliases قديمة وإدارة المنصة التي ليست ضمن MVP للموبايل. /api/auth/* على Vercel يوجّه إلى خدمة Node؛ استخدم /api/account/* للعمليات التي بقيت في Laravel. وجود route لا يثبت سلامة النشر.

| Method | Path | Middleware | Handler |
|---|---|---|---|
| POST | `api/account/forgot-password` | api, throttle:5,1 | `AuthController@forgotPassword` |
| POST | `api/account/login` | api | `AuthController@login` |
| POST | `api/account/logout` | api, api.auth | `AuthController@logout` |
| GET/HEAD | `api/account/me` | api, api.auth | `AuthController@me` |
| POST | `api/account/register` | api, throttle:10,1 | `AuthController@register` |
| POST | `api/account/register/google` | api, throttle:10,1 | `AuthController@registerGoogle` |
| POST | `api/account/reset-password` | api, throttle:10,1 | `AuthController@resetPassword` |
| GET/HEAD | `api/accounting/settings` | api, api.auth, permission:export_reports OR export_invoices OR export_payments OR export_sales OR manage_accounting_settings | `AccountingController@settings` |
| PUT | `api/accounting/settings` | api, api.auth, permission:manage_accounting_settings | `AccountingController@updateSettings` |
| GET/HEAD | `api/admin/audit-logs` | api, api.auth, role:admin, permission:manage_admin | `AuditLogController@admin` |
| PATCH | `api/admin/owners/{id}` | api, api.auth, role:admin, permission:manage_admin | `AdminController@updateOwner` |
| PATCH | `api/admin/owners/{id}/status` | api, api.auth, role:admin, permission:manage_admin | `AdminController@ownerStatus` |
| GET/HEAD | `api/admin/password-requests` | api, api.auth, role:admin, permission:manage_admin | `PasswordRequestController@index` |
| POST | `api/admin/password-requests/{id}/dismiss` | api, api.auth, role:admin, permission:manage_admin | `PasswordRequestController@dismiss` |
| POST | `api/admin/password-requests/{id}/link` | api, api.auth, role:admin, permission:manage_admin | `PasswordRequestController@link` |
| GET/HEAD | `api/admin/reports` | api, api.auth, role:admin, permission:manage_admin | `AdminController@reports` |
| GET/HEAD | `api/admin/restaurants` | api, api.auth, role:admin, permission:manage_admin | `AdminController@restaurants` |
| POST | `api/admin/restaurants` | api, api.auth, role:admin, permission:manage_admin | `AdminController@storeRestaurant` |
| PATCH | `api/admin/restaurants/{id}` | api, api.auth, role:admin, permission:manage_admin | `AdminController@updateOwner` |
| DELETE | `api/admin/restaurants/{id}` | api, api.auth, role:admin, permission:manage_admin | `AdminController@destroyRestaurant` |
| GET/HEAD | `api/admin/restaurants/{id}/features` | api, api.auth, role:admin, permission:manage_admin | `AdminController@features` |
| PUT | `api/admin/restaurants/{id}/features` | api, api.auth, role:admin, permission:manage_admin | `AdminController@updateFeatures` |
| PATCH | `api/admin/restaurants/{id}/plan` | api, api.auth, role:admin, permission:manage_admin | `AdminController@plan` |
| POST | `api/admin/restaurants/{id}/subscription/cancel` | api, api.auth, role:admin, permission:manage_admin | `AdminController@cancelSubscription` |
| POST | `api/admin/restaurants/{id}/trial/extend` | api, api.auth, role:admin, permission:manage_admin | `AdminController@extendTrial` |
| GET/HEAD | `api/admin/subscription-payments` | api, api.auth, role:admin, permission:manage_admin | `SubscriptionPaymentController@adminIndex` |
| POST | `api/admin/subscription-payments/{id}/reject` | api, api.auth, role:admin, permission:manage_admin | `SubscriptionPaymentController@reject` |
| POST | `api/admin/subscription-payments/{id}/verify` | api, api.auth, role:admin, permission:manage_admin | `SubscriptionPaymentController@verify` |
| PATCH | `api/assistance-requests/{id}/resolve` | api, api.auth, permission:handle_assistance | `SessionController@resolveAssistance` |
| POST | `api/auth/forgot-password` | api, throttle:5,1 | `AuthController@forgotPassword` |
| POST | `api/auth/login` | api | `AuthController@login` |
| POST | `api/auth/logout` | api, api.auth | `AuthController@logout` |
| GET/HEAD | `api/auth/me` | api, api.auth | `AuthController@me` |
| POST | `api/auth/register` | api, throttle:10,1 | `AuthController@register` |
| POST | `api/auth/register/google` | api, throttle:10,1 | `AuthController@registerGoogle` |
| POST | `api/auth/reset-password` | api, throttle:10,1 | `AuthController@resetPassword` |
| GET/POST/HEAD | `api/broadcasting/auth` | api, api.auth | `BroadcastController@authenticate` |
| GET/HEAD | `api/demo/guest` | api, throttle:30,1 | `DemoController@guest` |
| POST | `api/demo/session` | api, throttle:30,1 | `DemoController@start` |
| GET/HEAD | `api/kitchen/orders` | api, api.auth, permission:manage_orders, feature:kitchen | `OrderController@kitchen` |
| PATCH | `api/kitchen/orders/{id}/status` | api, api.auth, permission:manage_orders, feature:kitchen | `OrderController@status` |
| GET/HEAD | `api/me/branding` | api, api.auth, role:owner, permission:manage_branding | `BrandingController@show` |
| POST | `api/me/branding` | api, api.auth, role:owner, permission:manage_branding | `BrandingController@update` |
| POST | `api/me/branding/reset` | api, api.auth, role:owner, permission:manage_branding | `BrandingController@reset` |
| PATCH | `api/me/plan` | api, api.auth, role:owner, permission:manage_subscription | `AccountController@plan` |
| GET/HEAD | `api/me/restaurant` | api, api.auth, role:owner, permission:manage_restaurant | `AccountController@show` |
| PATCH | `api/me/restaurant` | api, api.auth, role:owner, permission:manage_restaurant | `AccountController@updateRestaurant` |
| PATCH | `api/me/theme` | api, api.auth, role:owner, permission:manage_branding | `AccountController@theme` |
| GET/HEAD | `api/media/{uuid}` | api | `MediaController@show` |
| GET/HEAD | `api/menu-categories` | api, api.auth, permission:manage_menu | `MenuCategoryController@index` |
| POST | `api/menu-categories` | api, api.auth, permission:manage_menu, subscription | `MenuCategoryController@store` |
| PUT/PATCH | `api/menu-categories/{menu_category}` | api, api.auth, permission:manage_menu, subscription | `MenuCategoryController@update` |
| DELETE | `api/menu-categories/{menu_category}` | api, api.auth, permission:manage_menu, subscription | `MenuCategoryController@destroy` |
| GET/HEAD | `api/menu-items` | api, api.auth, permission:manage_menu | `MenuController@index` |
| POST | `api/menu-items` | api, api.auth, permission:manage_menu, subscription | `MenuController@store` |
| PUT/PATCH | `api/menu-items/{menu_item}` | api, api.auth, permission:manage_menu, subscription | `MenuController@update` |
| DELETE | `api/menu-items/{menu_item}` | api, api.auth, permission:manage_menu, subscription | `MenuController@destroy` |
| GET/HEAD | `api/menu/{table_token}` | api | `MenuController@publicMenu` |
| GET/HEAD | `api/online-ordering/settings` | api, api.auth, permission:manage_settings | `OutsideOrderController@settings` |
| PUT | `api/online-ordering/settings` | api, api.auth, permission:manage_settings | `OutsideOrderController@updateSettings` |
| POST | `api/order-items/{id}/cancel` | api, api.auth, permission:cancel_orders | `OrderController@cancel` |
| POST | `api/order-items/{id}/reassign` | api, api.auth, permission:reassign_orders | `OrderController@reassign` |
| POST | `api/orders/{id}/cancel` | api, api.auth, permission:cancel_orders | `OrderController@cancelOrder` |
| PATCH | `api/orders/{id}/status` | api, api.auth, permission:manage_orders | `OrderController@status` |
| GET/HEAD | `api/outside-orders` | api, api.auth, permission:view_orders OR deliver_orders OR dispatch_deliveries | `OutsideOrderController@index` |
| GET/HEAD | `api/outside-orders/drivers` | api, api.auth, permission:dispatch_deliveries OR manage_orders OR view_payments | `OutsideOrderController@drivers` |
| POST | `api/outside-orders/{id}/accept` | api, api.auth, permission:manage_orders OR view_payments, subscription | `OutsideOrderController@accept` |
| POST | `api/outside-orders/{id}/assign` | api, api.auth, permission:dispatch_deliveries OR manage_orders OR view_payments, subscription | `OutsideOrderController@assign` |
| POST | `api/outside-orders/{id}/complete` | api, api.auth, permission:manage_orders OR view_payments OR deliver_orders OR dispatch_deliveries, subscription | `OutsideOrderController@complete` |
| POST | `api/outside-orders/{id}/dispatch` | api, api.auth, permission:manage_orders OR view_payments OR deliver_orders OR dispatch_deliveries, subscription | `OutsideOrderController@dispatch` |
| POST | `api/outside-orders/{id}/reject` | api, api.auth, permission:manage_orders OR view_payments, subscription | `OutsideOrderController@reject` |
| POST | `api/outside-orders/{id}/status` | api, api.auth, permission:view_orders, subscription | `OutsideOrderController@overrideStatus` |
| POST | `api/outside-orders/{id}/verify-payment` | api, api.auth, permission:manage_orders OR view_payments, subscription | `OutsideOrderController@verifyPayment` |
| GET/HEAD | `api/owner/audit-logs` | api, api.auth, role:owner, permission:manage_staff | `AuditLogController@owner` |
| GET/HEAD | `api/owner/finance/attendance` | api, api.auth, role:owner,manager, permission:manage_finance, feature:reports | `FinanceController@attendance` |
| PUT | `api/owner/finance/attendance` | api, api.auth, role:owner,manager, permission:manage_finance, feature:reports, subscription | `FinanceController@markAttendance` |
| GET/HEAD | `api/owner/finance/employees` | api, api.auth, role:owner,manager, permission:manage_finance, feature:reports | `FinanceController@employees` |
| POST | `api/owner/finance/employees` | api, api.auth, role:owner,manager, permission:manage_finance, feature:reports, subscription | `FinanceController@storeEmployee` |
| PATCH | `api/owner/finance/employees/{id}` | api, api.auth, role:owner,manager, permission:manage_finance, feature:reports, subscription | `FinanceController@updateEmployee` |
| DELETE | `api/owner/finance/employees/{id}` | api, api.auth, role:owner,manager, permission:manage_finance, feature:reports, subscription | `FinanceController@destroyEmployee` |
| GET/HEAD | `api/owner/finance/expenses` | api, api.auth, role:owner,manager, permission:manage_finance, feature:reports | `FinanceController@expenses` |
| POST | `api/owner/finance/expenses` | api, api.auth, role:owner,manager, permission:manage_finance, feature:reports, subscription | `FinanceController@storeExpense` |
| PATCH | `api/owner/finance/expenses/{id}` | api, api.auth, role:owner,manager, permission:manage_finance, feature:reports, subscription | `FinanceController@updateExpense` |
| DELETE | `api/owner/finance/expenses/{id}` | api, api.auth, role:owner,manager, permission:manage_finance, feature:reports, subscription | `FinanceController@destroyExpense` |
| GET/HEAD | `api/owner/finance/payroll` | api, api.auth, role:owner,manager, permission:manage_finance, feature:reports | `FinanceController@payroll` |
| GET/HEAD | `api/owner/finance/summary` | api, api.auth, role:owner,manager, permission:manage_finance, feature:reports | `FinanceController@summary` |
| GET/HEAD | `api/owner/orders` | api, api.auth, permission:view_orders | `OrderController@owner` |
| GET/HEAD | `api/owner/orders/{id}` | api, api.auth, permission:view_orders | `OrderController@show` |
| GET/HEAD | `api/owner/reports/sales-trend` | api, api.auth, role:owner, permission:view_reports, feature:reports | `OwnerReportsController@salesTrend` |
| GET/HEAD | `api/payments/pending` | api, api.auth, permission:view_payments | `PaymentController@pending` |
| POST | `api/payments/{id}/reconcile` | api, api.auth, permission:verify_payments, throttle:30,1 | `BillingController@reconcile` |
| POST | `api/payments/{id}/reject` | api, api.auth, permission:verify_payments, throttle:30,1 | `PaymentController@reject` |
| POST | `api/payments/{id}/verify` | api, api.auth, permission:verify_payments, throttle:30,1 | `PaymentController@verify` |
| GET/HEAD | `api/permissions` | api, api.auth | `PermissionController@catalog` |
| GET/HEAD | `api/public/outside-orders/{id}` | api, throttle:60,1 | `OutsideOrderController@track` |
| GET/HEAD | `api/public/restaurants` | api, throttle:60,1 | `OutsideOrderController@restaurants` |
| GET/HEAD | `api/public/restaurants/{slug}` | api | `OutsideOrderController@restaurant` |
| POST | `api/public/restaurants/{slug}/orders` | api, throttle:10,1 | `OutsideOrderController@place` |
| GET/HEAD | `api/public/sessions/{id}` | api, session.token | `SessionController@show` |
| POST | `api/public/sessions/{id}/assistance-requests` | api, session.token, throttle:10,1 | `SessionController@assistance` |
| GET/HEAD | `api/public/sessions/{id}/bill` | api, session.token | `BillingController@customerBill` |
| POST | `api/public/sessions/{id}/bill-request` | api, session.token, throttle:10,1 | `BillingController@request` |
| PATCH | `api/public/sessions/{id}/customer` | api, session.token | `SessionController@updateCustomer` |
| POST | `api/public/sessions/{id}/leave` | api, session.token, throttle:10,1 | `SessionController@leave` |
| GET/HEAD | `api/public/sessions/{id}/orders` | api, session.token | `OrderController@session` |
| POST | `api/public/sessions/{id}/orders` | api, session.token, throttle:30,1, subscription:session | `OrderController@submit` |
| GET/HEAD | `api/public/sessions/{id}/orders/stream` | api, session.token | `OrderController@stream` |
| POST | `api/public/sessions/{id}/payment` | api, session.token, throttle:20,1, subscription:session | `PaymentController@submit` |
| GET/HEAD | `api/public/sessions/{id}/payment-options` | api, session.token | `PaymentController@options` |
| GET/HEAD | `api/public/tables/{code}/menu` | api | `MenuController@publicMenu` |
| POST | `api/public/tables/{code}/sessions` | api, subscription:table, feature:dine_in,table | `SessionController@open` |
| GET/HEAD | `api/reports/export/daily` | api, api.auth, permission:export_sales OR export_reports, throttle:20,1 | `AccountingController@export` |
| GET/HEAD | `api/reports/export/invoices` | api, api.auth, permission:export_invoices OR export_reports, throttle:20,1 | `AccountingController@export` |
| GET/HEAD | `api/reports/export/payments` | api, api.auth, permission:export_payments OR export_reports, throttle:20,1 | `AccountingController@export` |
| GET/HEAD | `api/reports/export/products` | api, api.auth, permission:export_sales OR export_reports, throttle:20,1 | `AccountingController@export` |
| GET/HEAD | `api/reports/export/sales` | api, api.auth, permission:export_sales OR export_invoices OR export_reports, throttle:20,1 | `AccountingController@export` |
| GET/HEAD | `api/sessions` | api, api.auth, permission:view_tables OR view_orders | `SessionController@active` |
| GET/HEAD | `api/sessions/stream` | api, api.auth, permission:view_tables OR view_orders | `SessionController@stream` |
| POST | `api/sessions/{id}/assistance/resolve` | api, api.auth, permission:handle_assistance | `SessionController@resolveSessionAssistance` |
| GET/HEAD | `api/sessions/{id}/bill` | api, api.auth, permission:view_payments OR view_tables | `BillingController@bill` |
| POST | `api/sessions/{id}/call-waiter` | api, session.token, throttle:10,1 | `SessionController@assistance` |
| POST | `api/sessions/{id}/close` | api, api.auth, permission:close_session, throttle:20,1 | `BillingController@close` |
| POST | `api/sessions/{id}/orders` | api, session.token, throttle:30,1, subscription:session | `OrderController@submit` |
| POST | `api/sessions/{id}/payment` | api, api.auth, permission:record_payment, throttle:30,1 | `BillingController@pay` |
| POST | `api/sessions/{id}/request-bill` | api, session.token, throttle:10,1 | `BillingController@request` |
| PATCH | `api/sessions/{sessionId}/bill-items/{item}` | api, api.auth, permission:adjust_bill, throttle:30,1 | `BillingController@adjust` |
| POST | `api/staff` | api, api.auth, permission:manage_staff, subscription, feature:staff | `StaffController@store` |
| GET/HEAD | `api/staff` | api, api.auth, permission:manage_staff | `StaffController@index` |
| PATCH | `api/staff/{id}/status` | api, api.auth, permission:manage_staff | `StaffController@status` |
| PUT/PATCH | `api/staff/{staff}` | api, api.auth, permission:manage_staff | `StaffController@update` |
| DELETE | `api/staff/{staff}` | api, api.auth, permission:manage_staff | `StaffController@destroy` |
| GET/HEAD | `api/subscription` | api, api.auth, role:owner, permission:manage_subscription | `SubscriptionPaymentController@show` |
| POST | `api/subscription/payments` | api, api.auth, role:owner, permission:manage_subscription, throttle:10,1 | `SubscriptionPaymentController@store` |
| POST | `api/tables` | api, api.auth, permission:manage_tables, subscription, feature:dine_in | `TableController@store` |
| GET/HEAD | `api/tables` | api, api.auth, permission:view_tables | `TableController@index` |
| GET/HEAD | `api/tables/{id}/qr` | api, api.auth, permission:manage_tables, subscription, feature:dine_in | `TableController@qr` |
| PATCH | `api/tables/{id}/status` | api, api.auth, permission:manage_tables, subscription, feature:dine_in | `TableController@updateStatus` |
| GET/HEAD | `api/tables/{id}/status` | api, api.auth, permission:view_tables | `TableController@status` |
| PUT/PATCH | `api/tables/{table}` | api, api.auth, permission:manage_tables, subscription, feature:dine_in | `TableController@update` |
| DELETE | `api/tables/{table}` | api, api.auth, permission:manage_tables, subscription, feature:dine_in | `TableController@destroy` |
