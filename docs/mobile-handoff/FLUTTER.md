# تعليمات تنفيذ Flutter

## بنية التنفيذ المقترحة

ابدؤوا بالـSDK وإدارة الحالة والحزم المعتمدة لدى الفريق؛ لا تفرض هذه الحزمة إصدارات dependencies جديدة. استخدموا Material 3 مع theme menuPilot، ARB للعربية/الإنجليزية، وDTOs مكتوبة الأنواع. اجعلوا الشبكة خارج Widgets.

```text
apps/customer/lib/
  app/                 # router, theme, localization, bootstrap
  features/restaurants/ # data, domain, presentation
  features/menu/
  features/cart/
  features/checkout/
  features/tracking/
apps/operations/lib/
  app/
  features/auth/
  features/orders/
  features/kitchen/
  features/tables/
  features/payments/
  features/delivery/
packages/shared_api/    # transport, DTOs, ApiFailure, repositories
packages/design_system/ # tokens, cards, buttons, status labels
```

هذا مخطط ملفات مقترح، وليس ملفات تطبيق مضافة لهذا المستودع. أي Riverpod/BLoC أو Dio/http يختاره الفريق يجب أن يحقق العقود أدناه؛ لا تخلطوا أكثر من إدارة حالة لنفس المجال.

## مهمة الشبكة الأولى

1. flavors dev/staging/prod مع apiOrigin خارج كود الشاشات. Production يستخدم الأصل الواحد الحالي، HTTPS فقط.
2. Native cookie jar يدعم domain/path/expiry/secure وSet-Cookie المتعدد ويحفظ Cookie الجلسة وخطوة 2FA. Cookie تنقل فقط للأصل المحدد. لا تطبع headers أو body تسجيل الدخول.
3. التخزين الدائم للجلسة إن اختير يجب تشفيره وتقييده بمخزن الجهاز الآمن؛ لا SharedPreferences/plaintext. امسح بيانات الحساب والكاش والطوابير عند logout أو تبديل المستخدم. التطبيق Native لا يعتمد على حماية httpOnly الخاصة بمتصفح الويب.
4. AuthRepository: signIn → إذا twoFactorRedirect اعرض OTP → verify → get /account/me. انتهاء الجلسة أو إعادة تعيين كلمة السر يلغي الوصول. لا تضف auto-refresh وهميًا؛ لا endpoint له حاليًا.
5. ApiFailure يحفظ status/code/message/fieldErrors/retryAfter دون PII. افصل NetworkFailure عن استجابة قائمة فارغة.
6. Cancel طلبات البحث/الشاشة عند dispose، ومنع overlap في polling. retries محدودة للقراءة فقط مع backoff/jitter. الكتابة لا يعاد إرسالها آليًا إلا إذا أثبتت idempotency المسار.
7. قفل زر الكتابة أثناء الإرسال، لكن بعد انتهاء مهلة إنشاء الطلب العام اعرض «تعذّر التأكد من إرسال الطلب» ولا تزعم الفشل النهائي.

## DTOs والحالة

DeliveryRestaurant: id:int, slug:String?, name:String, description/address/logoUrl:String?, open:bool, paused:bool, hours:OpeningHours?, prepMinutes:int?, zones:List<DeliveryZone>, deliveryStatus:enum مع unknown fallback, menuAvailable:bool. أثناء توافق إصدار قديم استعمل slug صالحًا كبديل menuAvailable، ولا تفترض وجود id قبل نشر العقد الجديد.

OnlineMenuItem: id، price num، options list، isAvailable bool. خارج الطلب يستخدم `imageUrl`؛ لا تغيّره إلى image_url بلا mapping. OutsideOrder منفصل عن KitchenOrder لأن الويب الحالي له حقول مختلفة؛ لا توحّدهما بالحدس.

الحالات الأساسية لكل repository: initial/loading/ready/empty/error/offlineStale. البيانات القديمة تبقى مرئية مع مؤشر توقيت آخر تحديث، لكن لا تُعرض كأنها اتصال حي. Mutation state مستقل لتفادي تعطيل الشاشة كلها عند تحديث طلب واحد.

احتفظ بسلة واحدة لكل restaurant id/slug، وحذر قبل تبديل المطعم. تخزين سلة الزبون مختلف عن session cookie؛ لا تحفظ بيانات بطاقة بنكية أو كلمات مرور. سجل التتبع المحلي يحفظ id/token في تخزين محمي، ولا يدّعي أنه سجل سحابي دائم.

## التنقل وNative

- الزبائن: Restaurants → Menu → Item sheet → Cart → Checkout → Tracking. الروابط /r/{slug} و/o/{id}?token=… تحتاج إعداد Android App Links وiOS Universal Links لاحقًا؛ لا تعتبر النموذج إعدادًا لهذه الروابط.
- الموظفون: Boot → Login → OTP اختياري → Role-aware home. عند منع صلاحية في الخادم أعد تحميل me وأزل الإجراء؛ لا تثق بالشاشات المخفية كحماية.
- السائق: Assigned → Order detail → external maps باستخدام الموقع المتاح أو العنوان → dispatch → تأكيد التسليم والتحصيل. لا زر تغيير عشوائي للحالة ولا override المالك.
- إذن الموقع وقت طلبه فقط، بديل يدوي دائمًا. الاتصال الهاتفي والخريطة إجراءات خارجية تحتاج دعم الجهاز وإظهار الوجهة.
- Google Native مؤجل حتى اعتماد deep-link/OAuth flow يحافظ على سياسات الربط و2FA الموجودة. لا تنقل أسرار Google إلى Flutter.

## بوابات التسليم

- Contract tests على fixture آتية من API staging بعد إخفاء البيانات الشخصية.
- Unit: حساب العرض بالشيكل، parsing nullable zones/slug، تصنيف الأخطاء، منطق السلة والإضافات.
- Widget: RTL/LTR، تكبير الخط 200%، الحالات الخمس للمطعم، منع صنف غير متاح، 401/403/409/422.
- Integration على جهاز Android وiPhone حقيقيين: دخول مع/بدون 2FA، حفظ وإلغاء Cookie، تسجيل خروج، دورة توصيل كاملة، فقد الشبكة بعد POST، foreground/background، تغيير الصلاحية من الويب.
- لا إصدار متجر قبل سياسة خصوصية وبيانات المتجر ومفاتيح التوقيع المملوكة للفريق وتحقق auth الفعلي. هذه أعمال تسليم مطلوبة، وليست منجزة في هذه الحزمة.

مراجع الفريق الرسمية: [Flutter networking](https://docs.flutter.dev/cookbook/networking/fetch-data)، [Internationalization](https://docs.flutter.dev/ui/accessibility-and-internationalization/internationalization)، [Testing](https://docs.flutter.dev/testing/overview).
