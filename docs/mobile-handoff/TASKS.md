# Backlog تنفيذي — Flutter + Backend + QA

المراحل أدناه ترتيب اعتماد وليست مواعيد أو تقدير ساعات. المالك المذكور تخصص؛ يعيّن الفريق الأسماء. لا تنقلوا أي مهمة إلى Done قبل دليل القبول. «موجود» يعني في المصدر، لا أنه اختُبر على الهاتف.

| ID | أولوية / مسؤول | التاسك | الاعتماد | معيار القبول |
|---|---|---|---|---|
| API-01 | P0 Backend/QA | نشر إصلاح دليل المطاعم | اختبارات الحزمة | يظهر مطعم له الميزة بلا مناطق كقريبًا؛ لا يقبل طلبًا غير جاهز؛ غير المؤهل لا يظهر |
| API-02 | P0 Backend | تجهيز staging ومطعم اختبار وأدوار منفصلة | بنية الاستضافة | دورة طلب كاملة بلا لمس طلبات العملاء، /health يؤكد DB، أسرار خارج Git |
| AUTH-01 | P0 Flutter/Backend | Spike للجلسة Cookie على Android وiOS | API-02 | دخول، /me، 2FA، logout، انتهاء وإلغاء جلسة؛ توثيق قرارات التخزين |
| AUTH-02 | P0 Backend عند فشل spike | عقد Native session/token آمن | AUTH-01 | issuance/revocation/expiry و2FA وdevice binding موثقة؛ لا تعطيل policy الويب؛ لا يبدأ تنفيذه كأنه موجود |
| CORE-01 | P0 Flutter | flavors + transport + ApiFailure + repositories | API-02 | لا localhost في prod؛ لا PII في logs؛ طلبات قابلة للإلغاء وتصنيف الأخطاء |
| CORE-02 | P0 Flutter/Design | theme + ARB + RTL + common states | UIUX | 360px و200% نص، focus/semantics، كل حالة لها loading/empty/error |
| STAFF-01 | P0 Flutter | login/OTP/session gate و/me | AUTH-01 | التوجيه حسب permissions؛ لا خلط حسابين أو بيانات مطعمين |
| CUS-01 | P0 Flutter | دليل المطاعم والبحث والفلتر | API-01,CORE-02 | slug null وzones=[] لا يكسران الشاشة؛ 5 حالات ظاهرة |
| CUS-02 | P0 Flutter | منيو وصنف وإضافات | CUS-01 | غير المتاح معطّل؛ إضافة لها ID ثابت؛ السعر المرجعي من السيرفر |
| CUS-03 | P0 Flutter | سلة لكل مطعم | CUS-02 | تغيير مطعم يتطلب قرار المستخدم؛ quantity1..50؛ لا تسرب سلة بين المطاعم |
| CUS-04 | P0 Flutter | checkout، المنطقة، الرسوم، عنوان يدوي | CUS-03 | min قبل fee؛ فشلGPS لا يمنع؛ 422 بجوارالحقل؛ transfer proof صالح |
| CUS-05 | P0 Flutter | نجاح + حفظ id/token + تتبع | CUS-04 | tracking Header آمن؛ restore بعد إغلاق التطبيق؛ ممنوع token في analytics |
| OPS-01 | P0 Flutter | inbox قبول/رفض وتحضير | STAFF-01 | انتظار إرسال، سبب رفض، 409 يعيد جلب الطلب، لا نجاح متفائل للمال |
| OPS-02 | P0 Flutter | المطبخ | OPS-01 | pending→preparing→ready؛ طلب غير مقبول لا يظهر؛ polling متوقف بالخلفية |
| DEL-01 | P0 Flutter | مدير التوصيل وتعيين السائق | OPS-02 | جاهز فقط؛ driver_id من قائمة drivers؛ 422/NOT_READY واضحان |
| DEL-02 | P0 Flutter | السائق: معين لي/تفاصيل/dispatch/complete | DEL-01 | لا بيانات سائق آخر؛ تأكيد التحصيل؛ انتقالات صحيحة؛ ليس سجلًا شاملًا |
| API-03 | P0 Backend | تقوية Idempotency الموجودة لإنشاء طلب توصيل عام | API-02 | هوية محاولة مستقلة عن IP وتخزين متين؛ نفس key+payload يعطي نفس الطلب؛ payload مختلف409؛ tenant/TTL/concurrency/redeploy tests |
| QA-01 | P0 QA | اختبار contract من Collection | API-02 | public ثم owner ثم cashier/kitchen/driver؛ ممنوع المرور بين مطعمين |
| QA-02 | P0 QA/Flutter | اختبار timeout بعد حفظ POST | API-03,CUS-04 | لا طلب مزدوج؛ استعادة نتيجة معروفة أو رسالة عدم التأكد |
| OPS-03 | P1 Flutter | النادل والطاولات والجلسات | STAFF-01 | حالات الطاولة، طلب المساعدة وحله، صلاحيات فعلية |
| OPS-04 | P1 Flutter | الكاشير والفاتورة والتحويل | OPS-03 | paid/pending/rejected منفصلة؛ منع إغلاق غير صالح؛ لا تكرار دفع |
| MENU-01 | P1 Flutter | toggle توفر الصنف لصاحب الصلاحية | STAFF-01 | التغيير يظهر في الويب والموبايل؛ طلب stale يرفض ITEM_UNAVAILABLE |
| RT-01 | P1 DevOps/Backend | تشغيل Reverb وربط الإنتاج | API-02 | اتصال wss موثّق، auth خاص صحيح، إعادة اشتراك، fallback؛ لا أسرار في التطبيق |
| RT-02 | P1 Flutter | realtime + lifecycle + foreground fallback | RT-01 | حدث يعيد الجلب، لا polling مكرر، backoff، reconcile بعد resume |
| PUSH-01 | P1 Backend/Flutter | FCM/APNs وتسجيل الجهاز | AUTH-01 | device token lifecycle، opt-in، auth/tenant routing، logout unregister؛ endpoints جديدة مطلوبة |
| API-04 | P1 Backend | Pagination وسجل السائق | DEL-02 | cursor/filter موثق، history مخوّل؛ لا اعتبار limit200 pagination |
| NATIVE-01 | P1 Flutter/Backend | App/Universal Links | CUS-05 | رابط مطعم وتتبع يفتح الوجهة الصحيحة؛ token لا يسجل |
| QA-03 | P1 QA | الشبكة الضعيفة وRTL والصلاحيات | جميعP0 | Android+iOS فعليان؛ فيديو دورة وتسليم تقرير bugs |
| RELEASE-01 | P1 Release | signing وprivacy والمتاجر ومراقبة الأخطاء | QA-03 | build موقع، version، rollback، logs منزوعة PII؛ موافقة مالك الحساب على النشر |
| LATER-01 | P2 Product/Backend | حسابات زبائن وعناوين محفوظة وسجل سحابي | قرار منتج | عقود جديدة واختبارات قبل واجهات تعد بخدمات غير موجودة |
| LATER-02 | P2 Product/Backend | موقع سائق حي ودفع بطاقات | قرار منتج | موافقة وخصوصية ومزود دفع وتكلفة؛ غير متاح في الباك الحالي |

## سيناريو قبول مشترك للإصدار الأول

مطعم مفعّل ومنطقة وصنف → الزبون يرسل cash → الموظف يقبل → المطبخ يحضّر ويجهّز → المدير يعيّن → السائق يخرج → الزبون يرى الحالة → السائق يؤكد التسليم والتحصيل → تحقق الطلب نفسه والرسوم نفسها في الويب والموبايل. يعاد السيناريو مع صنف ينفد قبل checkout، وتحويل غير مؤكد، وموظف غير مخوّل، وفقد اتصال، ودخول بحساب مطعم ثان.

## مهام التصميم

UI-01 مكتبة المكونات/tokens؛ UI-02 رحلة الزبون؛ UI-03 عمليات المطعم؛ UI-04 السائق؛ UI-05 الحالات والأخطاء وRTL/LTR وaccessibility؛ UI-06 handoff لكل شاشة: مقاسات/تفاعل/permission/endpoint/empty/loading/error. النموذج المرفق أساس للمراجعة، وليس ملف Figma أو تصميم متجر نهائي.
