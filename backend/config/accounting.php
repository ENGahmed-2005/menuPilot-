<?php

/*
|--------------------------------------------------------------------------
| Accounting export — field catalogue and export profiles
|--------------------------------------------------------------------------
| fields:   every internal field an export can produce (key => [type, label]).
|           Types drive real Excel cell types (money/number/int/date/time).
| exports:  default column order per export type.
| profiles: how columns are named/ordered for a target accounting program.
|           'generic'  = menuPilot's Arabic layout.
|           'alaseel'  = Al-Aseel Al-Thahabi. UNVERIFIED DRAFT: the headers
|                        below are placeholders until they are checked
|                        against the actual Al-Aseel import template/version
|                        (see docs/ACCOUNTING_EXPORT.md). A restaurant can
|                        override any header or drop a column in its
|                        accounting settings (column_mapping) without code.
*/

return [
    'fields' => [
        'invoice_number' => ['string', 'رقم الفاتورة'],
        'invoice_date' => ['date', 'تاريخ الفاتورة'],
        'invoice_time' => ['time', 'وقت الفاتورة'],
        'restaurant' => ['string', 'المطعم'],
        'branch' => ['string', 'الفرع'],
        'table' => ['string', 'الطاولة'],
        'session_id' => ['int', 'رقم الجلسة'],
        'order_reference' => ['string', 'مرجع الطلب'],
        'customer' => ['string', 'الزبون'],
        'product_code' => ['string', 'رمز الصنف'],
        'product_name' => ['string', 'اسم الصنف'],
        'category' => ['string', 'التصنيف'],
        'account_code' => ['string', 'رمز الحساب'],
        'quantity' => ['number', 'الكمية'],
        'unit_price' => ['money', 'سعر الوحدة'],
        'discount' => ['money', 'الحسم'],
        'tax' => ['money', 'الضريبة'],
        'subtotal' => ['money', 'المجموع قبل الضريبة'],
        'total' => ['money', 'الإجمالي'],
        'paid' => ['money', 'المدفوع'],
        'outstanding' => ['money', 'المتبقي'],
        'items_count' => ['int', 'عدد الأصناف'],
        'payment_method' => ['string', 'طريقة الدفع'],
        'payment_status' => ['string', 'حالة الدفع'],
        'invoice_status' => ['string', 'حالة الفاتورة'],
        'order_status' => ['string', 'حالة الطلب'],
        'cashier' => ['string', 'الكاشير'],
        'waiter' => ['string', 'النادل'],
        'payment_id' => ['int', 'رقم الدفعة'],
        'payment_date' => ['date', 'تاريخ الدفع'],
        'payment_time' => ['time', 'وقت الدفع'],
        'amount' => ['money', 'المبلغ'],
        'currency' => ['string', 'العملة'],
        'reference_number' => ['string', 'رقم المرجع'],
        'transaction_reference' => ['string', 'مرجع العملية'],
        'notes' => ['string', 'ملاحظات'],
        'quantity_sold' => ['number', 'الكمية المباعة'],
        'gross_sales' => ['money', 'إجمالي المبيعات'],
        'net_sales' => ['money', 'صافي المبيعات'],
        'date' => ['date', 'التاريخ'],
        'orders_count' => ['int', 'عدد الطلبات'],
        'invoices_count' => ['int', 'عدد الفواتير'],
        'cash_sales' => ['money', 'مبيعات نقدية'],
        'electronic_sales' => ['money', 'مبيعات إلكترونية'],
        'pending_payments' => ['money', 'مدفوعات معلّقة'],
        'cancelled_amount' => ['money', 'ملغى / مسترد'],
    ],

    // Fields summed in the totals row.
    'sum_fields' => ['quantity', 'discount', 'tax', 'subtotal', 'total', 'paid', 'outstanding', 'items_count', 'amount', 'quantity_sold', 'gross_sales', 'net_sales', 'orders_count', 'invoices_count', 'cash_sales', 'electronic_sales', 'pending_payments', 'cancelled_amount'],

    'exports' => [
        // E / A-detail: one row per invoice item
        'invoices' => ['invoice_number', 'invoice_date', 'invoice_time', 'restaurant', 'branch', 'table', 'session_id', 'order_reference', 'product_code', 'product_name', 'category', 'account_code', 'quantity', 'unit_price', 'discount', 'tax', 'subtotal', 'total', 'payment_method', 'payment_status', 'invoice_status', 'cashier', 'waiter', 'order_status'],
        // A: one row per invoice
        'sales' => ['invoice_number', 'invoice_date', 'invoice_time', 'restaurant', 'branch', 'table', 'session_id', 'customer', 'items_count', 'subtotal', 'discount', 'tax', 'total', 'paid', 'outstanding', 'payment_method', 'payment_status', 'invoice_status', 'cashier', 'waiter'],
        // B
        'payments' => ['payment_id', 'invoice_number', 'payment_date', 'payment_time', 'payment_method', 'account_code', 'amount', 'currency', 'payment_status', 'cashier', 'reference_number', 'transaction_reference', 'notes'],
        // C
        'products' => ['product_code', 'product_name', 'category', 'account_code', 'quantity_sold', 'unit_price', 'gross_sales', 'discount', 'tax', 'net_sales'],
        // D
        'daily' => ['date', 'orders_count', 'invoices_count', 'gross_sales', 'discount', 'tax', 'net_sales', 'cash_sales', 'electronic_sales', 'pending_payments', 'cancelled_amount'],
    ],

    'profiles' => [
        'generic' => ['label' => 'menuPilot (عام)', 'verified' => true, 'headers' => []],
        'alaseel' => [
            'label' => 'الأصيل الذهبي (مسودة، تحتاج تحقق)',
            'verified' => false,
            // Placeholder headers only — replace with the exact column names of
            // your Al-Aseel import template (settings → column mapping).
            'headers' => [
                'invoice_number' => 'رقم الفاتورة',
                'invoice_date' => 'التاريخ',
                'product_code' => 'رقم المادة',
                'product_name' => 'اسم المادة',
                'quantity' => 'الكمية',
                'unit_price' => 'الإفرادي',
                'discount' => 'الحسم',
                'tax' => 'الضريبة',
                'total' => 'الإجمالي',
                'payment_method' => 'طريقة الدفع',
                'customer' => 'الزبون',
                'account_code' => 'رقم الحساب',
            ],
        ],
    ],

    // Account keys a restaurant can set (codes are restaurant data, never defaults).
    'account_keys' => ['sales', 'cash', 'bank', 'electronic', 'tax', 'discount', 'customer'],

    // Rows are read in chunks of this size (memory stays flat).
    'chunk' => 1000,
];
