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

اختياري ومُستحسن: `BETTER_AUTH_SECRET` بنفس قيمة خدمة الدخول، فيتحقق Laravel من توقيع كوكي الجلسة.

## 3. خدمة الدخول (Better Auth) — مجلد `auth/`
خدمة Node صغيرة تسجّل الدخول وتكتب الجلسات في نفس قاعدة MySQL، وLaravel يقرأها (التفاصيل في `docs/auth.md`).
- **Railway:** خدمة `auth`، Root Directory = `/auth`، أمر التشغيل `npm start`، فحص الصحة `/live`.
- **Render (بديل):** Web Service من نوع Docker، المجلد `auth/` (فيه `Dockerfile`).

| المتغير | القيمة |
|---|---|
| `BETTER_AUTH_SECRET` | سر عشوائي 32 حرفًا على الأقل (`openssl rand -base64 32`)، ونفس القيمة في Laravel |
| `DATABASE_URL` أو `DB_HOST` / `DB_PORT` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | نفس قاعدة Laravel |
| `NODE_ENV` | `production` |
| `AUTH_CLIENT_IP_HEADER` | `x-vercel-forwarded-for,x-forwarded-for` (عنوان الزائر الحقيقي خلف Vercel وRailway) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `MAIL_FROM_ADDRESS` | لتأكيد البريد واستعادة كلمة المرور بالبريد (بدونها يبقى طلب الاستعادة عبر واتساب) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | للدخول بحساب Google. رابط الرجوع: `https://menupilot.vercel.app/api/auth/callback/google` |

الخدمة تنتظر حتى تُطبَّق migrations الـ Laravel (تعطي 503 مؤقتًا)، ثم تعمل وحدها.

## 4. Vercel (Frontend)
الواجهة تطلب الـ API دائمًا من نفس عنوانها (`/api`) وتمرّرها (`vercel.json`):
`/api/auth/*` و`/api/auth-config` إلى خدمة الدخول، و`/api/*` و`/up` إلى Laravel على Render. إذا تغيّر عنوان أي خدمة عدّله في `vercel.json`.

**Railway (Frontend):** يقرأ `frontend/Caddyfile` ويحتاج متغيرين: `AUTH_UPSTREAM=http://${{auth.RAILWAY_PRIVATE_DOMAIN}}:${{auth.PORT}}` (خدمة الدخول عبر الشبكة الداخلية، حتى يصلها عنوان الواجهة وIP الزائر كما هما) و`API_UPSTREAM` (عنوان الـ backend، https). المتغير القديم `VITE_API_BASE_URL` لم يعد يُستخدم.

## 5. اختبار الإنتاج (Go / No-Go)
بعد كل نشر شغّل من جهازك:
```bash
node scripts/smoke-test.mjs https://menupilot.vercel.app
# حساب الأدمن يحذف المطعم التجريبي بعد الاختبار، وينشئه إذا كان تأكيد البريد مفعّلًا:
SMOKE_ADMIN_EMAIL=... SMOKE_ADMIN_PASSWORD=... node scripts/smoke-test.mjs https://menupilot.vercel.app
```
يُعطى عنوان **الواجهة** (هي التي تمرّر `/api` و`/api/auth`). يغطي أكثر من 30 فحصًا: الصحة، وقاعدة البيانات، والمصادقة، ومسار الزبون، والمطبخ، والكاشير، والجلسة/الخروج. النتيجة `🟢 GO` أو `🔴 NO-GO` مع سبب كل فشل.

## 6. بعد النشر
- افتح `https://<backend>/health`، يجب أن يرجع `{"status":"ok"}`.
- افتح `https://<frontend>/api/auth-config` (خدمة الدخول تعمل)، ثم سجّل الدخول بحساب الأدمن.
- من صفحة «الأمان وتسجيل الدخول» تأكد أن عنوان IP الظاهر لجهازك هو عنوانك الحقيقي (وإلا عدّل `AUTH_PROXY_HOPS`، انظر `docs/auth.md`).
- جرّب "نسيت كلمة المرور" وتأكد من وصول البريد.
- أنشئ طاولة، وامسح رمز QR من هاتف داخل نطاق 200 متر من المطعم، وأرسل طلبًا.
- ارفع صورة لصنف، ثم أعد نشر الخدمة وتأكد أن الصورة ما زالت تظهر.

## 7. ما تغيّر أمنيًا
- **تسجيل الدخول (Better Auth):** الجلسة في كوكي httpOnly لا يقرؤها JavaScript، التحقق بخطوتين، إدارة الأجهزة، الدخول بحساب Google، وقفل الحساب 15 دقيقة بعد 5 محاولات خاطئة (`docs/auth.md`).
- **استعادة كلمة المرور:** الرابط يُرسل بالبريد فقط، صالح 60 دقيقة ولمرة واحدة، ويسجّل الخروج من كل الأجهزة، والاستجابة واحدة سواء كان البريد مسجلًا أم لا.
- **جلسات الزبائن:** كل جلسة لها رمز سري (`X-Session-Token`). رقم الجلسة وحده لم يعد كافيًا للوصول إليها.
- **الصور:** تُخزَّن في قاعدة البيانات وتُعرض من `/api/media/{uuid}`، فلا تضيع عند إعادة النشر.
- **رموز QR:** تُبنى من `FRONTEND_URL` في الـ Backend، ومن عنوان الواجهة نفسها في الواجهة.
