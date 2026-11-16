# عقد API لفريق Flutter

## العناوين والمصادقة

Production origin الحالي: `https://menupilot-lilac.vercel.app`؛ `base_url = origin + /api`. استخدم الأصل الواحد للـAuth والـLaravel كي تبقى Cookie الجلسة على النطاق الصحيح. عنوان Render للباك وحده لا يقدّم تسجيل الدخول الجديد.

Local: شغّل Laravel وخدمة `auth` وواجهة Vite التي تعمل proxy حسب إعداد المشروع. Postman يستخدم `http://localhost:5173/api` افتراضيًا. الهاتف الحقيقي يحتاج عنوان جهاز التطوير القابل للوصول مع trusted origin مضبوط في بيئة التطوير؛ لا تشحن عنوان localhost في إصدار الموبايل.

| المسار | الاستخدام |
|---|---|
| `GET /auth-config` | معرفة توفر Google والبريد، دون أسرار |
| `POST /auth/sign-in/email` | `{email,password,rememberMe:true}`؛ Cookie session، وقد يرجع `twoFactorRedirect` |
| `POST /auth/two-factor/verify-totp` | `{code,trustDevice:false}`؛ استكمال 2FA مع Cookie المؤقتة من تسجيل الدخول |
| `POST /auth/two-factor/verify-backup-code` | `{code,trustDevice:false}`؛ استهلاك كود احتياطي |
| `GET /auth/get-session` | حالة جلسة Better Auth، بلا token داخل JSON |
| `GET /account/me` | المستخدم ودوره وصلاحياته واشتراكه؛ مصدر واجهة الموظفين |
| `POST /auth/sign-out` | إنهاء جلسة الموظف |
| `GET /auth/list-sessions` | الأجهزة؛ لا يظهر token |
| `POST /auth/revoke-device` | `{id}`؛ id جلسة من قائمة الأجهزة |
| `POST /auth/request-password-reset` | `{email,redirectTo:"/reset-password"}`؛ يتطلب بريدًا مهيأ |

أرسل `Accept: application/json` و`Content-Type: application/json`. طلبات Auth الكتابية تحتاج `Origin` الموثوق؛ في Postman تضبطه البيئة إلى أصل الموقع. Cookie jar يجب أن يحفظ كل Set-Cookie ويعيد المناسب منها حسب النطاق والمسار والانتهاء، بما فيه Cookie خطوة 2FA. لا تجمع Set-Cookie بفاصلة ولا تحذف توقيع الجلسة.

**لا تتوقع `response.token`:** `auth/src/devices.js` يزيل التوكن من ردود تسجيل الدخول والجلسات. Laravel يقبل Bearer موقّعًا لكن مسار إصدار token Native غير موجود. الـCollection تستعمل Cookies، ولا تتجاوز التوقيع أو 2FA. التوكن التجريبي من `/demo/session` خاص بحسابات demo ولا يثبت صلاحية دخول الموظف الحقيقي.

`POST /account/login` و`POST /auth/login` في Laravel قديمان ويرجعان `410 USE_NEW_LOGIN`؛ لا تستخدمهما. على النطاق العام `/auth/*` يوجّه إلى خدمة Auth أصلًا، فلا تعتمد على aliases القديمة في Laravel. تسجيل المطعم `POST /account/register` يتطلب `restaurant_type` من `restaurant,cafe,fast-food,other`؛ إنشاء الموظف مسؤولية صاحب المطعم وليس self-signup.

## شكل الردود

أغلب Laravel: `{ "data": ... }`. الأخطاء: `{message,code?,errors?}`. Better Auth لا يلتزم بهذا الغلاف، وبعض نقاط Laravel أيضًا لها مفاتيح أعلى مختلفة؛ لا تفكّ الغلاف آليًا قبل معرفة المسار. تعامل مع null والحقول الاختيارية ولا تعرض رقم الهاتف أو token في logs.

الأموال JSON number في DTO الخارجي، وبعض استجابات المناطق الخام قد تكون decimal string؛ اقرأها كـnum/string بأمان. الأسعار بالشيكل في تجربة الطلب الحالية؛ لا تفترض أن أسعار اشتراك المنصة بالدولار هي عملة الطلب. التحويلات الزمنية ليست كلها ISO موحّدة حاليًا؛ احسم timezone الخادم قبل عرض عد تنازلي، ولا تفترض توقيت الهاتف هو توقيت المطعم.

## اكتشاف المطاعم والمنيو

`GET /public/restaurants` → `{data:[...]}`. لا يعتمد على تسجيل الدخول. البحث والفلترة حاليًا في العميل؛ لا توجد معاملات nearby أو pagination لهذا endpoint.

```json
{
  "id": 123,
  "slug": "restaurant-slug",
  "name": "اسم المطعم",
  "description": null,
  "address": null,
  "logo_url": null,
  "open": false,
  "paused": false,
  "hours": null,
  "prep_minutes": null,
  "zones": [],
  "delivery_status": "setup_required",
  "menu_available": false
}
```

`id` هو مفتاح البطاقة، `slug` nullable قبل إعداد رابط الطلب. الحقول `id,delivery_status,menu_available` إضافات إصلاح هذه الحزمة وليست ضمانًا أنها نُشرت بعد. قيمة `open` هنا تعني جاهزية **التوصيل** الآن.

| delivery_status | ما يظهر | الإجراء |
|---|---|---|
| available | يستقبل الطلبات الآن | افتح المنيو والطلب |
| paused | مشغول حاليًا | تصفح فقط |
| closed | مغلق الآن | تصفح وساعات العمل إن وجدت |
| setup_required | التوصيل قريبًا | لا تؤكد طلب توصيل؛ لا رابط إذا menu_available=false |
| unavailable | التوصيل غير متاح حاليًا | لا طلب؛ لا تكشف تفاصيل الاشتراك للزبون |

لا تحسب `min(zones.fee)` إذا القائمة فارغة. لا تبنِ `/r/null`. الشعار له fallback. فلتر «المتاح الآن» يستخدم open، وليس مجرد وجود ميزة التوصيل.

`GET /public/restaurants/{slug}` → restaurant{name,phone,whatsapp,logo_url,primary_color}, open, paused, hours, pickup, delivery, prep_minutes, zones, items. `open` هنا جاهزية استقبال أونلاين العامة، وقد يكون الاستلام متاحًا والتوصيل غير مكتمل. التوصيل يحتاج `delivery=true` ومنطقة نشطة؛ لا تنقل معنى open من الدليل حرفيًا إلى هذا الرد.

الصنف: `id,name,description,price,category,imageUrl,options,is_available`. الإضافة: `{id,name,price}`. الصنف غير المتاح يبقى ظاهرًا muted بعلامة «غير متوفر» مع تعطيل الإضافة، وليس حذفه من العرض. احتفظ بمفتاح سطر مركب من الصنف + الإضافات + الملاحظة.

## إرسال طلب الزبون

`POST /public/restaurants/{slug}/orders` بلا جلسة موظف:

```json
{
  "type": "delivery",
  "name": "زبون تجريبي",
  "phone": "0599123456",
  "address": "عنوان تجريبي واضح",
  "zone_id": 7,
  "notes": "الاتصال عند الوصول",
  "payment_method": "cash",
  "items": [{"menuItemId": 42, "quantity": 2, "note": "بدون بصل", "options": []}]
}
```

- `type`: delivery أو pickup إذا مفعّل. delivery يحتاج address وzone_id من مناطق المطعم.
- الاسم ≤120؛ الهاتف 7–20 أرقام/مسافات مع + اختياري؛ العنوان والملاحظات ≤500.
- 1–50 سطرًا؛ الكمية 1–50؛ ملاحظة السطر ≤300؛ options قائمة **IDs** وليست objects أو أسعارًا.
- الموقع اختياري: `latitude,longitude,location_accuracy`. اطلب إذن الموقع عند الضغط على «مشاركة موقعي» فقط؛ رفض الإذن لا يمنع العنوان اليدوي. الإحداثيات staff-only في الرد، ولا يوجد بث موقع السائق.
- `payment_method`: cash أو transfer. transfer يحتاج `proof` بصيغة data:image/png|jpeg|webp;base64… بحجم الصورة حتى 5MB. مسار إرسال الإثبات لطلب التوصيل يختلف عن رفع ملف دفعة طاولة.
- لا ترسل total أو delivery_fee كمرجع محاسبي. الخادم يعيد تسعير الصنف والإضافات ويحسب الرسوم والحد الأدنى.
- الحد الأدنى للمناطق على مجموع الأصناف **قبل رسوم التوصيل**.
- النتيجة 201: data فيها id,order_number,channel,fulfillment_status,kitchen_status,payment_method,payment_status,items,subtotal,delivery_fee,total,token,tracking_url. احفظ id وtoken بأمان فور النجاح.
- لا تعاود POST تلقائيًا بعد timeout: ربما حُفظ الطلب. توجد middleware عامة لـ`Idempotency-Key` تحفظ الرد الناجح 24 ساعة مع قفل30ثانية؛ نطاقها user أو session أو IP + method + path + key. لكنها لا تطابق payload، والزائر الخارجي يعتمد على IP، والكاش قد لا يصمد أمام إعادة النشر. لا تعتبرها ضمانًا نهائيًا لطلبات الموبايل عبر شبكات متغيرة؛ تاسك التقوية موضح في TASKS. المفتاح 8–100 من الحروف/الأرقام/_/-؛ يحتفظ العميل بنفسه لنفس المحاولة ولا يعيد استعماله لطلب جديد.

`GET /public/outside-orders/{id}` مع `X-Order-Token` هو المفضل؛ `?token=` مدعوم للروابط. لا ترسل توكن طلب لطلب آخر. يرجع تفاصيله وeta_at وrealtime_channel وrestaurant. هذه بيانات خاصة بمن يملك التوكن؛ لا تحفظ رابط التتبع في analytics.

## تشغيل الموظفين والسائقين

كل المسارات التالية نسبية إلى `/api` وتحتاج جلسة الموظف. جدول صلاحيات جميع مسارات Laravel في API-ROUTES.

| العملية | المسار | Body / ملاحظات |
|---|---|---|
| طلبات خارجية | `GET /outside-orders?status=active` | active / awaiting / done / delivery؛ حد 200؛ done آخر يومين فقط |
| قبول | `POST /outside-orders/{id}/accept` | `{prep_minutes:20}` بين 5–240 |
| رفض | `POST /outside-orders/{id}/reject` | `{reason:"سبب واضح"}` 2–255 |
| المطبخ | `GET /kitchen/orders` | response مختلف عن DTO الخارج؛ طابق المصدر |
| حالة المطبخ | `PATCH /kitchen/orders/{id}/status` | `{status:"preparing"}` ثم ready؛ لا تقفز المراحل |
| السائقون | `GET /outside-orders/drivers` | id هنا account_user_id، لا id سجل staff |
| تعيين | `POST /outside-orders/{id}/assign` | `{driver_id:123}` أو null للفك؛ الطلب جاهز أولًا |
| خرج للتوصيل | `POST /outside-orders/{id}/dispatch` | `{}`؛ قد يرجع DRIVER_REQUIRED |
| اكتمل/تحصيل | `POST /outside-orders/{id}/complete` | `{}`؛ الدفع التحويلي يجب أن يكون مؤكّدًا |
| تأكيد تحويل | `POST /outside-orders/{id}/verify-payment` | `{}`؛ موظف مخوّل فقط |
| طلبات المالك | `GET /owner/orders` و`GET /owner/orders/{id}` | view_orders |
| إعدادات الأونلاين | `GET/PUT /online-ordering/settings` | settings + zones + plan_allows؛ PUT zones يستبدل القائمة ويولد IDs جديدة |
| الطاولات | `GET /tables` | view_tables |
| الجلسات | `GET /sessions` | view_tables أو view_orders |
| فاتورة | `GET /sessions/{id}/bill` | view_payments أو view_tables |
| دفع فاتورة | `POST /sessions/{id}/payment` | `{method:"cash",close:false}`؛ cash/electronic/ussd |
| إغلاق | `POST /sessions/{id}/close` | `{}`؛ close_session |
| مساعدة نادل | `PATCH /assistance-requests/{id}/resolve` | `{}`؛ handle_assistance |
| توفر صنف | `PUT /menu-items/{id}` | `{is_available:false}`؛ manage_menu |

تسلسل التوصيل: awaiting_acceptance → accepted (kitchen pending → preparing → ready) → تعيين سائق إن وجد → out_for_delivery → completed. rejected حالة نهائية. السائق لا يرى إلا الطلبات المعيّنة له الجاهزة أو الخارجة للتوصيل؛ لا تَعِده بسجل كامل في `/outside-orders?status=done` لأن فرع السائق يفرض delivery board.

النادل/الكاشير لا يأخذان كل العمليات تلقائيًا. اقرأ permissions؛ role=manager يبدأ قراءة فقط. السائق role=delivery لديه deliver_orders؛ مدير التوصيل لديه dispatch_deliveries وdeliver_orders. الطلبات مخفية عن المطبخ حتى يقبلها المطعم.

## الأخطاء وسلوك العميل

| حالة | تصرف Flutter |
|---|---|
| 401 | امسح الجلسة غير الصالحة واطلب الدخول؛ لا تدخل حلقة retry |
| 403 | وضح عدم الصلاحية، وأعد قراءة /account/me عند الحاجة |
| 404 | الرابط أو المورد غير متاح؛ لا تفترض وجوده في مطعم آخر |
| 409 | أعد جلب المورد: ORDER_ALREADY_HANDLED / INVALID_TRANSITION / NOT_READY / DRIVER_REQUIRED / PAYMENT_NOT_VERIFIED / ONLINE_ORDERING_CLOSED |
| 422 | اعرض errors بجانب الحقول؛ ITEM_UNAVAILABLE يفرض إعادة جلب المنيو؛ BELOW_MIN_ORDER يعرض المبلغ الناقص |
| 429 | احترم Retry-After إن توفر؛ TOO_MANY_PENDING بعد 3 طلبات منتظرة لنفس هاتف الزبون |
| 503 / timeout | رسالة تعذر مؤقت + إعادة محاولة للقراءة؛ لا تحولها إلى «لا توجد مطاعم» |

## Realtime والتحديث

الكود يدعم قناة `private-restaurant.{ownerId}` وتوقيع `POST /broadcasting/auth` بـsocket_id وchannel_name للمستخدم المخوّل. استخرج هوية المطعم من الرد المعتمد ولا تستخدم staff user.id كأنه ownerId. القنوات العامة عشوائية وتصل في ردود التتبع. الحدث إشارة لإعادة الجلب وليس مصدرًا موثوقًا للأسعار/الحالة. راجع `docs/realtime.md`؛ تشغيل خادم Reverb وربط env لم يتم التحقق منه حيًا.

حتى يثبت الاتصال: polling في foreground فقط؛ baseline الويب 4 ثوانٍ للمطبخ و8 للخارج و5 للتتبع. أوقفه في background/logout مع backoff عند الفشل. هذه مدد تحديث وليست ضمانًا لزمن حفظ الطلب. Push للموبايل يحتاج backend جديدًا ولا يُستبدل باتصال WebSocket في الخلفية.
