# الصلاحيات، إغلاق الجلسات، وحساب الأدمن

## الصلاحيات
المصدر الوحيد: `backend/app/Support/Permissions.php` (نسخة للواجهة في `frontend/src/config/permissions.js`).

| الدور | الصلاحيات |
|---|---|
| admin | كل الصلاحيات (المنصة كاملة) |
| owner | كل صلاحيات مطعمه فقط |
| manager | كل صلاحيات المطعم عدا `manage_subscription` |
| cashier | view_dashboard, view_tables, view_orders, view_menu, view_payments, verify_payments, record_payment, adjust_bill, close_session, cancel_orders, reassign_orders, handle_assistance |
| waiter | view_tables, view_orders, view_menu, cancel_orders, reassign_orders, handle_assistance |
| kitchen | view_orders, manage_orders, view_menu |

- يستطيع المالك تخصيص صلاحيات أي موظف (`staff.permissions`). القيمة `null` تعني صلاحيات الدور الافتراضية.
- لا أحد يمنح صلاحية لا يملكها، ولا يعدّل أو يوقف أو يحذف حسابه بنفسه.
- الحماية الفعلية في Laravel عبر middleware `permission:`. الواجهة تخفي الأزرار فقط.
- إيقاف موظف أو تعطيل مالك يسحب التوكن فورًا ويمنع الـ API. تعطيل المالك يوقف موظفيه أيضًا.

## دورة الجلسة (`App\Support\SessionLifecycle`)
`open → active → bill_requested → payment_pending → paid → closed` مشتقة من البيانات الفعلية (الطلبات، الفاتورة، المدفوعات)، وتُرجع مع `canClose` و`closeBlocker`. قيم `dining_sessions.status` المخزّنة لم تتغير للتوافق.

## إغلاق الجلسة
`POST /api/sessions/{id}/close` (صلاحية `close_session`):
- 409 `SESSION_ALREADY_CLOSED` / 409 `PAYMENT_PENDING_VERIFICATION`
- 422 `OUTSTANDING_BALANCE` / 422 `PAYMENT_REQUIRED`
- عند النجاح: `closed_at`، حل طلبات النادل المفتوحة، الطاولة `available`، وسجل تدقيق `session.closed`.

## حساب الأدمن
```bash
# عند النشر (يعمل تلقائيًا في Dockerfile) — من متغيرات البيئة فقط
ADMIN_NAME="menuPilot Admin" ADMIN_EMAIL=ops@example.com ADMIN_PASSWORD='12+ chars' \
php artisan db:seed --class=AdminSeeder --force

# يدويًا (كلمة المرور تُطلب مخفية)
php artisan menupilot:create-admin --email=ops@example.com
```
لا يُنشئ أدمن ثانيًا، ولا يرقّي حساب مالك إلى أدمن، ولا يغيّر كلمة المرور إلا مع `ADMIN_RESET_PASSWORD=true` (لمرة واحدة).

## سجل التدقيق
جدول `audit_logs`: الدفع، التأكيد، الرفض، التسوية، تعديل السعر، إغلاق الجلسة، تغييرات الموظفين، وإجراءات الأدمن. لا يخزّن كلمات مرور أو توكنات.
- المالك: `GET /api/owner/audit-logs`
- الأدمن: `GET /api/admin/audit-logs`
