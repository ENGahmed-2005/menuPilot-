/* ==========================================================================
   PasswordRequests.jsx — «استعادة كلمات المرور» (platform admin).
   An owner who forgot the password creates a request from /forgot-password.
   The admin creates a one-time link (valid 60 min) and sends it to the
   owner's restaurant phone on WhatsApp. The link is built from this site's
   own domain, so it works even if FRONTEND_URL is not configured.
   ========================================================================== */
import { useEffect, useState } from "react";
import { Copy, KeyRound, MessageCircle, X } from "lucide-react";
import { createPasswordLink, dismissPasswordRequest, getPasswordRequests } from "../../api/admin";
import { whatsappNumber } from "../../api/outsideOrders";
import { errorText } from "../../utils/errors";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";
import { t as tr, locale } from "../../i18n";

const STATUS = { pending: [tr("بانتظار الإرسال"), "warning"], sent: [tr("أُرسل الرابط"), "success"], dismissed: [tr("متجاهَل"), "neutral"] };

export default function PasswordRequests() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [links, setLinks] = useState({}); // request id → { url, wa }
  const [busy, setBusy] = useState(null);
  const load = () => getPasswordRequests().then((d) => setRows(d || [])).catch((e) => toast.error(errorText(e)));
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function makeLink(r) {
    setBusy(r.id);
    try {
      const d = await createPasswordLink(r.id);
      const url = `${window.location.origin}/reset-password?token=${encodeURIComponent(d.token)}&email=${encodeURIComponent(d.email)}`;
      const text = tr("مرحبًا {0}، هذا رابط إعادة تعيين كلمة مرور حسابك في menuPilot (صالح لمدة {1} دقيقة ولمرة واحدة):\n{2}\n\nإذا لم تطلب ذلك، تجاهل هذه الرسالة.", { 0: d.name || "", 1: d.expires_minutes, 2: url });
      setLinks((l) => ({ ...l, [r.id]: { url, wa: d.phone ? `https://wa.me/${whatsappNumber(d.phone)}?text=${encodeURIComponent(text)}` : null } }));
      toast.success(tr("أُنشئ الرابط. أرسله الآن على واتساب."));
      load();
    } catch (e) { toast.error(errorText(e)); } finally { setBusy(null); }
  }
  async function dismiss(r) {
    setBusy(r.id);
    try { await dismissPasswordRequest(r.id); load(); } catch (e) { toast.error(errorText(e)); } finally { setBusy(null); }
  }

  return (
    <div>
      <PageHeader title={tr("استعادة كلمات المرور")} subtitle={tr("طلبات أصحاب المطاعم الذين نسوا كلمة المرور. أنشئ رابطًا لمرة واحدة وأرسله على واتساب.")} />
      {!rows.length ? <Card><EmptyState icon={KeyRound} title={tr("لا توجد طلبات")} description={tr("تظهر هنا الطلبات فور إرسالها من صفحة «نسيت كلمة المرور».")} /></Card> : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold">{r.restaurant_name || r.name} · <span className="font-medium text-muted">{r.name}</span></p>
                    <p className="text-sm text-muted"><span dir="ltr">{r.email}</span> · <span dir="ltr">{r.restaurant_phone || tr("بلا رقم هاتف")}</span></p>
                    <p className="text-xs text-muted">{tr("طُلب")} {new Date(r.updated_at).toLocaleString(locale)}</p>
                  </div>
                  <Badge tone={STATUS[r.status]?.[1]}>{STATUS[r.status]?.[0]}</Badge>
                </div>
                {links[r.id] ? (
                  <div className="flex flex-wrap gap-2 rounded-xl bg-surface-2 p-3">
                    {links[r.id].wa
                      ? <a href={links[r.id].wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1f9d55] px-4 text-sm font-bold text-white"><MessageCircle size={16} /> {tr("إرسال على واتساب")}</a>
                      : <span className="text-xs font-bold text-brick">{tr("لا يوجد رقم هاتف للمطعم. انسخ الرابط وأرسله بطريقة أخرى.")}</span>}
                    <button type="button" onClick={() => navigator.clipboard?.writeText(links[r.id].url).then(() => toast.success(tr("نُسخ الرابط.")))} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold ring-1 ring-line"><Copy size={15} /> {tr("نسخ الرابط")}</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" loading={busy === r.id} onClick={() => makeLink(r)}><KeyRound size={15} /> {r.status === "sent" ? tr("إنشاء رابط جديد") : tr("إنشاء رابط")}</Button>
                    {r.status === "pending" && <Button size="sm" variant="secondary" disabled={busy === r.id} onClick={() => dismiss(r)}><X size={15} /> {tr("تجاهل")}</Button>}
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
