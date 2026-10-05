# دليل النشر — menuPilot

## 1. قبل النشر
1. ادمج `feature/sprints-3-6-completion` في `main` بعد نجاح الـ CI.
2. خذ نسخة احتياطية من قاعدة البيانات. الـ migrations إضافية وتُطبَّق تلقائيًا عند تشغيل الحاوية.
3. ألغِ أي GitHub token قديم مكشوف.

## 2. متغيرات Render (Backend)
| المتغير | القيمة |
|---|---|
| `APP_KEY` | ناتج `php artisan key:generate --show` |
| `APP_URL` | `https://menupilot-backend.onrender.com` |
| `FRONTEND_URL` | عنوان الواجهة، مثل `https://menupilot.vercel.app` (روابط QR والبريد) |
| `DB_CONNECTION` / `DB_HOST` / `DB_PORT` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | MySQL الخارجي |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | حساب الأدمن (12 حرفًا على الأقل) |
| `MAIL_MAILER=smtp`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION=tls`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME` | لرسائل استعادة كلمة المرور |

القيم التالية مضبوطة افتراضيًا في الـ Dockerfile ولا تحتاج إدخالًا:
`APP_ENV=production`, `APP_DEBUG=false`, `LOG_CHANNEL=stderr`, `SESSION_DRIVER=file`, `CACHE_STORE=file`, `PHP_CLI_SERVER_WORKERS=6`.

> مزودات SMTP مجانية مناسبة: Brevo (300 رسالة يوميًا)، أو Gmail مع App Password للتجربة فقط.

## 3. Vercel (Frontend)
`.env.production` جاهز: `VITE_API_BASE_URL`، `VITE_USE_MOCKS=false`، `VITE_REALTIME_MODE=polling`. عدّل `VITE_API_BASE_URL` إذا تغيّر عنوان الـ Backend.

## 4. اختبار الإنتاج (Go / No-Go)
بعد كل نشر شغّل من جهازك:
```bash
node scripts/smoke-test.mjs https://menupilot-backend.onrender.com/api
# لحذف المطعم التجريبي تلقائيًا بعد الاختبار:
SMOKE_ADMIN_EMAIL=... SMOKE_ADMIN_PASSWORD=... node scripts/smoke-test.mjs https://menupilot-backend.onrender.com/api
```
يغطي 30 فحصًا: الصحة، وقاعدة البيانات، والمصادقة، ومسار الزبون، والمطبخ، والكاشير، والجلسة/الخروج. النتيجة `🟢 GO` أو `🔴 NO-GO` مع سبب كل فشل.

## 5. بعد النشر
- افتح `https://<backend>/health`، يجب أن يرجع `{"status":"ok"}`.
- سجّل الدخول بحساب الأدمن.
- جرّب "نسيت كلمة المرور" وتأكد من وصول البريد.
- أنشئ طاولة، وامسح رمز QR من هاتف داخل نطاق 200 متر من المطعم، وأرسل طلبًا.
- ارفع صورة لصنف، ثم أعد نشر الخدمة وتأكد أن الصورة ما زالت تظهر.

## 6. ما تغيّر أمنيًا
- **استعادة كلمة المرور:** الرابط يُرسل بالبريد فقط، صالح 60 دقيقة، والاستجابة واحدة سواء كان البريد مسجلًا أم لا.
- **جلسات الزبائن:** كل جلسة لها رمز سري (`X-Session-Token`). رقم الجلسة وحده لم يعد كافيًا للوصول إليها.
- **الصور:** تُخزَّن في قاعدة البيانات وتُعرض من `/api/media/{uuid}`، فلا تضيع عند إعادة النشر.
- **رموز QR:** تُبنى من `FRONTEND_URL` في الـ Backend، ومن عنوان الواجهة نفسها في الواجهة.
