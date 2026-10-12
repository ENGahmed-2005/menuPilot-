/* ==========================================================================
   Security.jsx — /account/security, for every signed-in role (docs/auth.md)
   Change the password, turn two-step verification on or off (QR drawn here,
   the secret never leaves the page), see the devices signed in and sign
   them out, link Google. Everything goes to the auth service (api/auth.js).
   ========================================================================== */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { renderSVG } from "uqr";
import { Check, Copy, Download, KeyRound, LockKeyhole, LogOut, Monitor, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import Card, { CardHeader } from "../../components/dashboard/Card";
import PageHeader from "../../components/dashboard/PageHeader";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Spinner from "../../components/ui/Spinner";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import GoogleMark from "../../components/auth/GoogleMark";
import { useAuth } from "../../context/AuthContext";
import {
  authErrorMessage, changePassword, confirmTwoFactor, disableTwoFactor, getAuthConfig, linkGoogle, listDevices, listLinkedAccounts,
  newBackupCodes, revokeDevice, revokeOtherDevices, startTwoFactor, unlinkGoogle,
} from "../../api/auth";
import { t, dir, locale } from "../../i18n";

const fieldClass = "w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-copper focus:ring-4 focus:ring-copper/10";
const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const when = (value) => (value ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "");

function device(ua = "") {
  const os = /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return { label: [browser, os].filter(Boolean).join(" · ") || t("جهاز غير معروف"), mobile: /iOS|Android/.test(os) };
}

function Notice({ tone = "success", children }) {
  if (!children) return null;
  return <div role={tone === "error" ? "alert" : "status"} className={`mb-4 rounded-xl px-4 py-3 text-sm font-bold ${tone === "error" ? "bg-brick/10 text-brick" : "bg-herb/10 text-herb"}`}>{children}</div>;
}

/* ---- change password ------------------------------------------------------------ */
function PasswordCard() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "", others: true });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ tone: "success", text: "" });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!STRONG.test(form.next)) return setMsg({ tone: "error", text: t("8 أحرف على الأقل، مع حرف كبير وصغير ورقم ورمز.") });
    if (form.next !== form.confirm) return setMsg({ tone: "error", text: t("كلمتا المرور غير متطابقتين.") });
    setBusy(true);
    try {
      await changePassword({ currentPassword: form.current, newPassword: form.next, revokeOtherSessions: form.others });
      setForm({ current: "", next: "", confirm: "", others: true });
      setMsg({ tone: "success", text: form.others ? t("تم تغيير كلمة المرور وتسجيل الخروج من الأجهزة الأخرى.") : t("تم تغيير كلمة المرور.") });
    } catch (err) {
      setMsg({ tone: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="form" onSubmit={submit}>
      <CardHeader title={t("كلمة المرور")} description={t("استخدم كلمة مرور قوية لا تستعملها في مواقع أخرى.")} />
      <div className="grid gap-4 p-5">
        <Notice tone={msg.tone}>{msg.text}</Notice>
        <label className="block text-sm font-bold">{t("كلمة المرور الحالية")}
          <input type="password" autoComplete="current-password" required value={form.current} onChange={set("current")} className={`${fieldClass} mt-2`} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold">{t("كلمة المرور الجديدة")}
            <input type="password" autoComplete="new-password" required value={form.next} onChange={set("next")} className={`${fieldClass} mt-2`} />
          </label>
          <label className="block text-sm font-bold">{t("تأكيد كلمة المرور")}
            <input type="password" autoComplete="new-password" required value={form.confirm} onChange={set("confirm")} className={`${fieldClass} mt-2`} />
          </label>
        </div>
        <p className="text-xs text-muted">{t("8 أحرف على الأقل، مع حرف كبير وصغير ورقم ورمز.")}</p>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={form.others} onChange={set("others")} className="h-4 w-4 accent-copper" />
          {t("تسجيل الخروج من كل الأجهزة الأخرى")}
        </label>
        <div><Button type="submit" loading={busy}><LockKeyhole size={16} aria-hidden="true" />{t("تغيير كلمة المرور")}</Button></div>
      </div>
    </Card>
  );
}

/* ---- two-step verification -------------------------------------------------------- */
function BackupCodes({ codes }) {
  const [copied, setCopied] = useState(false);
  const text = codes.join("\n");
  const copy = async () => { await navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const download = () => {
    const url = URL.createObjectURL(new Blob([`menuPilot — ${t("رموز الاحتياط")}\n\n${text}\n`], { type: "text/plain" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "menupilot-backup-codes.txt" });
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div>
      <p className="mb-3 text-sm leading-6 text-ink-soft">{t("احفظ هذه الرموز في مكان آمن. كل رمز يعمل مرة واحدة إذا فقدت هاتفك. لن تظهر مرة أخرى.")}</p>
      <ul dir="ltr" className="grid grid-cols-2 gap-2 rounded-xl bg-paper-2 p-4 font-mono text-sm">
        {codes.map((c) => <li key={c} className="text-center tracking-wider">{c}</li>)}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={copy}>{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied ? t("تم النسخ") : t("نسخ")}</Button>
        <Button variant="secondary" size="sm" onClick={download}><Download size={15} aria-hidden="true" />{t("تنزيل")}</Button>
      </div>
    </div>
  );
}

/** Asks for the password (and runs `action` with it) in a dialog. */
function PasswordPrompt({ open, title, description, confirmLabel, tone, onClose, action }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setPassword(""); setError(""); } }, [open]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try { await action(password); } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (
    <Modal open={open} onClose={onClose} size="sm" title={title} description={description}>
      <form onSubmit={submit} className="grid gap-4">
        <Notice tone="error">{error}</Notice>
        <label className="block text-sm font-bold">{t("كلمة المرور")}
          <input type="password" autoFocus autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`${fieldClass} mt-2`} />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>{t("تراجع")}</Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} type="submit" loading={busy}>{confirmLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}

function TwoFactorCard() {
  const { user, refreshUser } = useAuth();
  const enabled = Boolean(user?.two_factor_enabled);
  const [prompt, setPrompt] = useState(null); // "enable" | "disable" | "codes"
  const [setup, setSetup] = useState(null); // {totpURI, backupCodes, step: "scan"|"codes"}
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [freshCodes, setFreshCodes] = useState(null);
  const [msg, setMsg] = useState("");

  const qr = useMemo(() => (setup ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderSVG(setup.totpURI, { ecc: "M", pixelSize: 6 }))}` : ""), [setup]);
  const secret = useMemo(() => (setup ? (new URL(setup.totpURI).searchParams.get("secret") || "").replace(/(.{4})/g, "$1 ").trim() : ""), [setup]);

  async function confirm(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await confirmTwoFactor(code);
      setSetup((s) => ({ ...s, step: "codes" }));
      await refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title={t("التحقق بخطوتين")}
        description={t("بعد كلمة المرور، يُطلب رمز من تطبيق مصادقة على هاتفك (Google Authenticator أو Microsoft Authenticator أو غيرهما).")}
        action={<span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${enabled ? "bg-herb/10 text-herb" : "bg-ink/[0.06] text-ink-soft"}`}>{enabled ? <ShieldCheck size={14} aria-hidden="true" /> : <ShieldOff size={14} aria-hidden="true" />}{enabled ? t("مفعّل") : t("غير مفعّل")}</span>}
      />
      <div className="p-5">
        <Notice>{msg}</Notice>
        {freshCodes && <div className="mb-4"><BackupCodes codes={freshCodes} /></div>}
        <div className="flex flex-wrap gap-2">
          {enabled ? (
            <>
              <Button variant="secondary" onClick={() => setPrompt("codes")}><KeyRound size={16} aria-hidden="true" />{t("رموز احتياط جديدة")}</Button>
              <Button variant="ghost" className="text-brick" onClick={() => setPrompt("disable")}><ShieldOff size={16} aria-hidden="true" />{t("إيقاف التحقق بخطوتين")}</Button>
            </>
          ) : (
            <Button onClick={() => setPrompt("enable")}><ShieldCheck size={16} aria-hidden="true" />{t("تفعيل التحقق بخطوتين")}</Button>
          )}
        </div>
      </div>

      <PasswordPrompt open={prompt === "enable"} onClose={() => setPrompt(null)} title={t("تفعيل التحقق بخطوتين")} description={t("أكّد كلمة المرور للمتابعة.")} confirmLabel={t("متابعة")}
        action={async (password) => { const data = await startTwoFactor(password); setPrompt(null); setCode(""); setError(""); setSetup({ ...data, step: "scan" }); }} />
      <PasswordPrompt open={prompt === "disable"} onClose={() => setPrompt(null)} tone="danger" title={t("إيقاف التحقق بخطوتين")} description={t("سيصبح الدخول بكلمة المرور وحدها. أكّد كلمة المرور للمتابعة.")} confirmLabel={t("إيقاف")}
        action={async (password) => { await disableTwoFactor(password); setPrompt(null); setFreshCodes(null); setMsg(t("تم إيقاف التحقق بخطوتين.")); await refreshUser(); }} />
      <PasswordPrompt open={prompt === "codes"} onClose={() => setPrompt(null)} title={t("رموز احتياط جديدة")} description={t("الرموز القديمة ستتوقف عن العمل. أكّد كلمة المرور للمتابعة.")} confirmLabel={t("إنشاء رموز جديدة")}
        action={async (password) => { const data = await newBackupCodes(password); setPrompt(null); setMsg(""); setFreshCodes(data.backupCodes); }} />

      <Modal open={Boolean(setup)} onClose={() => setSetup(null)} size="md" title={setup?.step === "codes" ? t("تم تفعيل التحقق بخطوتين") : t("امسح الرمز بتطبيق المصادقة")}>
        {setup?.step === "codes" ? (
          <div className="grid gap-4">
            <BackupCodes codes={setup.backupCodes} />
            <div className="flex justify-end"><Button onClick={() => setSetup(null)}>{t("تم، حفظت الرموز")}</Button></div>
          </div>
        ) : setup && (
          <form onSubmit={confirm} className="grid gap-4">
            <ol className="list-decimal space-y-1 ps-5 text-sm leading-6 text-ink-soft">
              <li>{t("افتح تطبيق المصادقة على هاتفك واختر إضافة حساب.")}</li>
              <li>{t("امسح الرمز، أو أدخل المفتاح يدويًا.")}</li>
              <li>{t("أدخل الرمز المكوّن من 6 أرقام الذي يظهر في التطبيق.")}</li>
            </ol>
            <img src={qr} alt={t("رمز QR لتطبيق المصادقة")} width="200" height="200" className="mx-auto rounded-xl border border-line bg-white p-2" />
            <p className="text-center text-xs text-muted">{t("المفتاح:")} <code dir="ltr" className="select-all font-mono text-sm text-ink">{secret}</code></p>
            <Notice tone="error">{error}</Notice>
            <input dir="ltr" autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={8} required value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456"
              aria-label={t("رمز التحقق")} className={`${fieldClass} text-center font-mono text-lg tracking-[.3em]`} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => setSetup(null)}>{t("تراجع")}</Button>
              <Button type="submit" loading={busy}>{t("تفعيل")}</Button>
            </div>
          </form>
        )}
      </Modal>
    </Card>
  );
}

/* ---- devices ------------------------------------------------------------------- */
function DevicesCard() {
  const [devices, setDevices] = useState(null);
  const [error, setError] = useState("");
  const [confirm, confirmDialog] = useConfirm();
  const load = () => listDevices().then((list) => setDevices([...list].sort((a, b) => (b.current - a.current) || new Date(b.updatedAt) - new Date(a.updatedAt)))).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);

  async function signOut(id) {
    try { await revokeDevice(id); await load(); } catch (err) { setError(err.message); }
  }
  async function signOutOthers() {
    if (!(await confirm({ title: t("تسجيل الخروج من الأجهزة الأخرى؟"), description: t("سيبقى هذا الجهاز فقط مسجّل الدخول."), confirmLabel: t("تسجيل الخروج"), tone: "danger" }))) return;
    try { await revokeOtherDevices(); await load(); } catch (err) { setError(err.message); }
  }

  const others = devices?.filter((d) => !d.current).length || 0;
  return (
    <Card>
      <CardHeader title={t("الأجهزة المسجّلة")} description={t("كل جهاز سجّل الدخول إلى حسابك. إذا لم تتعرف على جهاز، سجّل خروجه وغيّر كلمة المرور.")}
        action={others > 0 && <Button variant="secondary" size="sm" onClick={signOutOthers}><LogOut size={15} aria-hidden="true" />{t("الخروج من كل الأجهزة الأخرى")}</Button>} />
      <div className="p-5">
        <Notice tone="error">{error}</Notice>
        {!devices ? <Spinner label={t("جارِ تحميل الأجهزة…")} /> : (
          <ul className="divide-y divide-line">
            {devices.map((d) => {
              const info = device(d.userAgent);
              const Icon = info.mobile ? Smartphone : Monitor;
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink/[0.05] text-ink-soft"><Icon size={18} aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{info.label} {d.current && <span className="ms-1 rounded-full bg-herb/10 px-2 py-0.5 text-xs font-black text-herb">{t("هذا الجهاز")}</span>}</p>
                    <p className="text-xs text-muted"><bdi dir="ltr">{d.ipAddress || "—"}</bdi> · {t("آخر نشاط")} {when(d.updatedAt)}</p>
                  </div>
                  {!d.current && <Button variant="ghost" size="sm" className="text-brick" onClick={() => signOut(d.id)}>{t("تسجيل الخروج")}</Button>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {confirmDialog}
    </Card>
  );
}

/* ---- Google -------------------------------------------------------------------- */
function GoogleCard() {
  const [linked, setLinked] = useState(null);
  const [error, setError] = useState("");
  const [params] = useSearchParams();
  useEffect(() => {
    listLinkedAccounts().then((accounts) => setLinked(accounts.some((a) => a.providerId === "google"))).catch((err) => setError(err.message));
    // Back from Google after a failed link.
    const failed = params.get("error");
    if (failed) setError(authErrorMessage(failed, params.get("error_description")) || t("تعذّر ربط حساب Google. حاول مجددًا."));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const unlink = async () => { try { await unlinkGoogle(); setLinked(false); } catch (err) { setError(err.message); } };
  const link = async () => { try { await linkGoogle(); } catch (err) { setError(err.message); } };
  return (
    <Card>
      <CardHeader title={t("الدخول بحساب Google")} description={t("اربط حساب Google الذي يحمل نفس بريدك لتسجّل الدخول بضغطة واحدة.")} />
      <div className="flex flex-wrap items-center gap-3 p-5">
        <Notice tone="error">{error}</Notice>
        {params.get("linked") === "google" && linked && <Notice>{t("تم ربط حساب Google.")}</Notice>}
        <GoogleMark size={22} />
        <span className="flex-1 text-sm font-bold">{linked == null ? "…" : linked ? t("مرتبط") : t("غير مرتبط")}</span>
        {linked === false && <Button variant="secondary" onClick={link}>{t("ربط حساب Google")}</Button>}
        {linked && <Button variant="ghost" className="text-brick" onClick={unlink}>{t("إلغاء الربط")}</Button>}
      </div>
    </Card>
  );
}

export default function Security() {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  useEffect(() => { getAuthConfig().then(setConfig); }, []);

  return (
    <div dir={dir} className="mx-auto max-w-3xl space-y-5">
      <PageHeader title={t("الأمان وتسجيل الدخول")} subtitle={t("كلمة المرور، التحقق بخطوتين، والأجهزة التي سجّلت الدخول إلى حسابك.")} />
      {user?.is_demo ? (
        <Card className="p-6 text-sm leading-7 text-ink-soft">{t("هذه صفحة الأمان لحسابك الحقيقي. حسابات التجربة لا تملك كلمة مرور أو أجهزة لإدارتها.")}</Card>
      ) : (
        <>
          <PasswordCard />
          <TwoFactorCard />
          <DevicesCard />
          {config?.googleEnabled && <GoogleCard />}
        </>
      )}
    </div>
  );
}
