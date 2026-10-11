/* mail.js — the two e-mails the auth service sends: confirm your address, reset your password.
   Arabic first with an English line (the app's two languages). Without SMTP_HOST
   nothing is sent: /api/auth-config tells the frontend, which then offers the
   WhatsApp reset request instead. A recipient gets at most 3 e-mails per 15
   minutes, so the forms can't be used to flood someone's inbox. */
import nodemailer from "nodemailer";
import { config } from "./config.js";

// Without SMTP, outside production only: MAIL_TRANSPORT=memory keeps messages
// in `sentMail` (tests); MAIL_TRANSPORT=log prints them (local development).
export const sentMail = [];
const devTransport = config.production ? null : process.env.MAIL_TRANSPORT;
const transport = devTransport === "memory"
  ? { sendMail: async (message) => { sentMail.push(message); } }
  : devTransport === "log"
    ? { sendMail: async ({ to, subject, text }) => { console.log(`[mail] to ${to}: ${subject}\n${text}`); } }
    : config.smtp ? nodemailer.createTransport(config.smtp) : null;
export const mailEnabled = Boolean(transport);

const WINDOW_MS = 15 * 60_000;
const PER_WINDOW = 3;
const sentTo = new Map(); // address -> timestamps

function allowed(address) {
  const now = Date.now();
  const recent = (sentTo.get(address) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_WINDOW) { sentTo.set(address, recent); return false; }
  recent.push(now);
  sentTo.set(address, recent);
  if (sentTo.size > 10_000) for (const [key, times] of sentTo) if (!times.some((t) => now - t < WINDOW_MS)) sentTo.delete(key);
  return true;
}

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function layout({ title, intro, button, url, note, en }) {
  const html = `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#F4F1EA;font-family:Tahoma,Arial,sans-serif;color:#0F1B2D">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0F1B2D;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold">menu<span style="color:#EEA122">Pilot</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:20px">${escape(title)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.8">${escape(intro)}</p>
<p style="margin:0 0 24px"><a href="${escape(url)}" style="display:inline-block;background:#EEA122;color:#0F1B2D;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:12px">${escape(button)}</a></p>
<p style="margin:0 0 16px;font-size:13px;line-height:1.8;color:#5B6576">${escape(note)}</p>
<p dir="ltr" style="margin:0;font-size:13px;line-height:1.7;color:#5B6576;text-align:left">${escape(en)}</p>
</td></tr></table>
<p style="font-size:12px;color:#5B6576;margin:16px 0 0" dir="ltr">${escape(url)}</p>
</td></tr></table></body></html>`;
  const text = `${title}\n\n${intro}\n${url}\n\n${note}\n\n${en}\n`;
  return { html, text };
}

async function send(to, subject, body) {
  if (!transport) return;
  const address = String(to).trim().toLowerCase();
  if (!allowed(address)) {
    console.warn("[mail] skipped: too many e-mails to one address in 15 minutes");
    return;
  }
  try {
    await transport.sendMail({ from: config.mailFrom, to: address, subject, ...body });
  } catch (error) {
    // Logged without the address or the link (both are personal / secret).
    console.error("[mail] sending failed:", error?.code || error?.message || error);
  }
}

export function sendVerificationMail(user, url) {
  return send(user.email, "أكّد بريدك الإلكتروني · Confirm your e-mail — menuPilot", layout({
    title: "أكّد بريدك الإلكتروني",
    intro: `أهلًا ${user.name || ""}، اضغط الزر لتأكيد بريدك وتفعيل حسابك في menuPilot.`,
    button: "تأكيد البريد",
    url,
    note: "الرابط صالح لمدة ساعة. إذا لم تنشئ حسابًا في menuPilot فتجاهل هذه الرسالة.",
    en: "Confirm your e-mail to activate your menuPilot account. The link is valid for one hour. If you didn't sign up, ignore this e-mail.",
  }));
}

export function sendResetMail(user, url) {
  return send(user.email, "إعادة تعيين كلمة المرور · Reset your password — menuPilot", layout({
    title: "إعادة تعيين كلمة المرور",
    intro: "وصلنا طلب لإعادة تعيين كلمة مرور حسابك. اضغط الزر لاختيار كلمة مرور جديدة.",
    button: "اختيار كلمة مرور جديدة",
    url,
    note: "الرابط صالح لمدة ساعة ولمرة واحدة، وسيتم تسجيل خروجك من كل الأجهزة. إذا لم تطلب ذلك فتجاهل هذه الرسالة وكلمة مرورك كما هي.",
    en: "Use the button to choose a new menuPilot password. The link works once, for one hour, and signs you out everywhere. If you didn't ask for this, ignore this e-mail.",
  }));
}
