/**
 * menuPilot mail relay — يرسل بريد menuPilot من حساب Gmail الخاص بك عبر HTTPS.
 *
 * يُستدعى من Laravel (MAIL_MAILER=appsscript). الأسرار لا تُكتب هنا:
 * ضع MAIL_SECRET في Project Settings ← Script properties.
 * حد gmail.com عبر MailApp: 100 مستلم يوميًا.
 */

function doPost(e) {
  try {
    const secret = PropertiesService.getScriptProperties().getProperty('MAIL_SECRET');
    const data = JSON.parse(e.postData.contents);

    if (!secret || !safeEqual(String(data.secret || ''), secret)) {
      return reply({ ok: false, error: 'unauthorized' });
    }

    const to = String(data.to || '').trim();
    if (!/^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$/.test(to)) {
      return reply({ ok: false, error: 'invalid recipient' });
    }

    if (MailApp.getRemainingDailyQuota() < 1) {
      return reply({ ok: false, error: 'daily quota exhausted' });
    }

    const html = data.html ? String(data.html) : '';
    const body = data.text ? String(data.text) : stripHtml(html) || ' ';
    const options = {
      to: to,
      subject: String(data.subject || '(no subject)').slice(0, 250),
      body: body,
      name: String(data.name || 'menuPilot').slice(0, 100),
    };
    if (html) options.htmlBody = html;
    if (data.replyTo) options.replyTo = String(data.replyTo);

    MailApp.sendEmail(options);
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String((err && err.message) || err).slice(0, 200) });
  }
}

// فحص سريع من المتصفح: يجب أن يظهر {"ok":true,"service":"menuPilot mail relay"}
function doGet() {
  return reply({ ok: true, service: 'menuPilot mail relay' });
}

// شغّل هذه الدالة مرة واحدة من المحرر لمنح إذن إرسال البريد.
function authorize() {
  Logger.log('Remaining daily quota: ' + MailApp.getRemainingDailyQuota());
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function stripHtml(html) {
  return String(html).replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// مقارنة بزمن ثابت.
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
