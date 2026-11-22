# إرسال البريد عبر Gmail (Google Apps Script)

يستخدم حل بريد مجاني بلا دومين وبلا بطاقة. ريندر المجانية تحجب SMTP، لذلك يرسل Laravel طلب HTTPS إلى سكربت في حساب Gmail الخاص بك، والسكربت يرسل الرسالة بـ `MailApp`.

- حد حسابات gmail.com: **100 مستلم يوميًا**.
- الرسالة تخرج من عنوان Gmail نفسه. `MAIL_FROM_ADDRESS` لا يُستخدم، والاسم الظاهر هو `MAIL_FROM_NAME`.
- ليس للمستخدمين الكبار: عند الحاجة انتقل إلى MailerSend/Brevo مع دومين موثّق وغيّر `MAIL_MAILER` فقط.

## الإعداد (مرة واحدة)

1. افتح <https://script.google.com> بحساب Gmail الذي سيُرسل، ثم **New project**.
2. الصق محتوى [`Code.gs`](Code.gs) مكان الكود الموجود، واحفظ.
3. **Project Settings ← Script properties ← Add script property**: الاسم `MAIL_SECRET` والقيمة سر عشوائي طويل (نفس قيمة `APPS_SCRIPT_MAIL_SECRET` في ريندر).
4. اختر الدالة `authorize` من القائمة واضغط **Run**، ووافق على إذن إرسال البريد (قد تظهر شاشة "Google hasn't verified this app": **Advanced ← Go to … (unsafe)**، فالسكربت سكربتك).
5. **Deploy ← New deployment ← Web app**: *Execute as* = **Me**، *Who has access* = **Anyone**. انسخ رابط الـ Web App (ينتهي بـ `/exec`).
6. افتح الرابط في المتصفح: يجب أن يظهر `{"ok":true,"service":"menuPilot mail relay"}`.

## متغيرات ريندر (`menupilot-backend`)

| المتغير | القيمة |
|---|---|
| `MAIL_MAILER` | `appsscript` |
| `APPS_SCRIPT_MAIL_URL` | رابط الـ Web App |
| `APPS_SCRIPT_MAIL_SECRET` | نفس `MAIL_SECRET` |
| `MAIL_FROM_NAME` | الاسم الظاهر للمستلم (مثل `menuPilot`) |

## ملاحظات

- عند تعديل `Code.gs` لاحقًا: **Deploy ← Manage deployments ← Edit ← New version** (الرابط لا يتغير).
- لا تشارك رابط الـ Web App ولا السر؛ أي طلب بلا السر الصحيح يُرفض بـ `unauthorized`.
- التجربة: `php artisan menupilot:test-mail you@gmail.com`.
