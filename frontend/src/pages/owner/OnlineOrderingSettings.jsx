/* ==========================================================================
   OnlineOrderingSettings.jsx — «الطلب أونلاين» (settings popup tab).
   Enable / pause, pickup & delivery, prep time, ordering hours, public link
   + QR, delivery zones (fee, minimum order). The «delivery» add-on, on any plan.
   ========================================================================== */
import { useEffect, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { SUBSCRIPTION_ADDONS, subscriptionOf } from "../../config/subscriptions";
import { useAuth } from "../../context/AuthContext";
import { getOnlineOrderingSettings, saveOnlineOrderingSettings } from "../../api/outsideOrders";
import { errorText } from "../../utils/errors";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useToast } from "../../components/ui/Toast";
import { COUNTRY_CODES, splitE164, toE164, waLink } from "../../utils/whatsapp";
import { t } from "../../i18n";

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-line p-3">
      <span><span className="block text-sm font-bold">{label}</span>{hint && <span className="block text-xs text-muted">{hint}</span>}</span>
      <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--color-copper)]" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export default function OnlineOrderingSettings() {
  const toast = useToast();
  const { user } = useAuth();
  const planId = subscriptionOf(user).plan;
  const [data, setData] = useState(null);
  const [s, setS] = useState(null);
  const [zones, setZones] = useState([]);
  const [saving, setSaving] = useState(false);
  const [wa, setWa] = useState({ code: "+970", number: "" });
  const load = () => getOnlineOrderingSettings().then((d) => { setData(d); setS(d.settings); setZones(d.zones.map((z) => ({ ...z }))); setWa(splitE164(d.settings.whatsapp)); }).catch((e) => toast.error(errorText(e)));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const d = await saveOnlineOrderingSettings({ enabled: !!s.enabled, paused: !!s.paused, pickup_enabled: !!s.pickup_enabled, delivery_enabled: !!s.delivery_enabled, prep_minutes: Number(s.prep_minutes) || 20, whatsapp: toE164(wa.code, wa.number) || null, opens_at: s.opens_at || null, closes_at: s.closes_at || null, slug: s.slug, zones: zones.filter((z) => z.name).map((z) => ({ name: z.name, fee: Number(z.fee) || 0, min_order: Number(z.min_order) || 0, active: z.active !== false })) });
      setData(d); setS(d.settings); setZones(d.zones); setWa(splitE164(d.settings.whatsapp)); toast.success(t("حُفظت إعدادات الطلب أونلاين."));
    } catch (err) { toast.error(errorText(err, t("تعذّر الحفظ."))); } finally { setSaving(false); }
  }

  if (!s) return <div className="h-40 animate-pulse rounded-2xl bg-black/[0.05]" />;
  const set = (k) => (v) => setS((x) => ({ ...x, [k]: v }));
  // Built from the address this dashboard is served from (e.g. the Vercel
  // domain), so the link and QR are always the real public URL, even if the
  // backend's FRONTEND_URL isn't configured.
  const publicUrl = `${window.location.origin}/r/${s.slug}`;
  return (
    <form onSubmit={save} className="space-y-5">
      <div><h2 className="text-xl font-extrabold">{t("الطلب أونلاين (استلام وتوصيل)")}</h2><p className="mt-1 text-sm text-muted">{t("شارك رابط مطعمك ليطلب الزبائن من البيت، بلا أي عمولة.")}</p></div>
      {!data.plan_allows && (
        <Alert tone="warning" title={t("إضافة «{0}»", { 0: SUBSCRIPTION_ADDONS.delivery.name })}>
          {t("أضفها لاشتراكك بـ $")}{SUBSCRIPTION_ADDONS.delivery.price} {t("شهريًا مع أي خطة ليستقبل مطعمك طلبات الاستلام والتوصيل. يمكنك تجهيز الإعدادات الآن.")}{" "}
          <Link to={`/owner/subscription/${planId}`} state={{ requiredAddon: "delivery" }} className="font-bold underline">{t("أضف التوصيل")}</Link>
        </Alert>
      )}

      <div className="rounded-xl bg-surface-2 p-4">
        <p className="text-xs font-bold text-muted">{t("رابط الطلب")}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span dir="ltr" className="num break-all text-sm font-bold">{publicUrl}</span>
          <button type="button" onClick={() => navigator.clipboard?.writeText(publicUrl).then(() => toast.success(t("نُسخ الرابط.")))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-ink/[0.06]" aria-label={t("نسخ الرابط")}><Copy size={15} /></button>
          <a href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=16&data=${encodeURIComponent(publicUrl)}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-copper-ink underline-offset-4 hover:underline">{t("رمز QR للطباعة")}</a>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle label={t("تشغيل الطلب أونلاين")} checked={s.enabled} onChange={set("enabled")} />
        <Toggle label={t("مشغول الآن")} hint={t("إيقاف مؤقت دون إخفاء المنيو")} checked={s.paused} onChange={set("paused")} />
        <Toggle label={t("الاستلام من المطعم")} checked={s.pickup_enabled} onChange={set("pickup_enabled")} />
        <Toggle label={t("التوصيل")} hint={t("بسائقي المطعم")} checked={s.delivery_enabled} onChange={set("delivery_enabled")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label={t("وقت التحضير (دقيقة)")} type="number" min="5" max="240" value={s.prep_minutes} onChange={(e) => set("prep_minutes")(e.target.value)} />
        <Input label={t("يبدأ الطلب")} type="time" value={s.opens_at || ""} onChange={(e) => set("opens_at")(e.target.value)} hint={t("فارغ = طوال الوقت")} />
        <Input label={t("ينتهي الطلب")} type="time" value={s.closes_at || ""} onChange={(e) => set("closes_at")(e.target.value)} />
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-bold">{t("واتساب المطعم")}</legend>
        <div className="flex gap-2" dir="ltr">
          <select aria-label={t("مقدمة الدولة")} value={wa.code} onChange={(e) => setWa((w) => ({ ...w, code: e.target.value }))} className="h-11 rounded-[var(--radius-control)] border border-line bg-surface px-2 text-sm">
            {COUNTRY_CODES.map(([c, n]) => <option key={c + n} value={c}>{c} {n}</option>)}
          </select>
          <input aria-label={t("رقم واتساب")} type="tel" inputMode="tel" placeholder="599 123 456" value={wa.number} onChange={(e) => setWa((w) => ({ ...w, number: e.target.value }))} className="h-11 min-w-0 flex-1 rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm" />
        </div>
        <p className="mt-1 text-xs text-muted">
          {t("يتواصل معك الزبائن عليه لتأكيد الطلب والفاتورة.")} {toE164(wa.code, wa.number) && <a href={waLink(toE164(wa.code, wa.number), t("تجربة من إعدادات menuPilot"))} target="_blank" rel="noopener noreferrer" className="font-bold text-copper-ink underline-offset-4 hover:underline" dir="ltr">{toE164(wa.code, wa.number)} ↗</a>}
        </p>
      </fieldset>
      <Input label={t("رابط المطعم (بالإنجليزية)")} dir="ltr" value={s.slug} onChange={(e) => set("slug")(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} hint={t("أحرف إنجليزية وأرقام وشرطة")} />

      {Boolean(s.delivery_enabled) && (
        <fieldset>
          <legend className="mb-2 text-sm font-extrabold">{t("مناطق التوصيل")}</legend>
          <div className="space-y-2">
            {zones.map((z, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_110px_40px] items-center gap-2">
                <input aria-label={t("المنطقة")} placeholder={t("اسم المنطقة")} value={z.name} onChange={(e) => setZones((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="h-10 rounded-lg border border-line px-2 text-sm" />
                <input aria-label={t("رسوم التوصيل")} type="number" min="0" step="0.5" placeholder={t("الرسوم")} value={z.fee} onChange={(e) => setZones((l) => l.map((x, j) => (j === i ? { ...x, fee: e.target.value } : x)))} className="h-10 rounded-lg border border-line px-2 text-sm" />
                <input aria-label={t("الحد الأدنى")} type="number" min="0" step="1" placeholder={t("الحد الأدنى")} value={z.min_order} onChange={(e) => setZones((l) => l.map((x, j) => (j === i ? { ...x, min_order: e.target.value } : x)))} className="h-10 rounded-lg border border-line px-2 text-sm" />
                <button type="button" onClick={() => setZones((l) => l.filter((_, j) => j !== i))} aria-label={t("حذف المنطقة")} className="grid h-10 w-10 place-items-center rounded-lg text-brick hover:bg-brick/10"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => setZones((l) => [...l, { name: "", fee: 0, min_order: 0, active: true }])}><Plus size={15} /> {t("إضافة منطقة")}</Button>
        </fieldset>
      )}
      <div className="flex justify-end border-t border-line pt-4"><Button type="submit" loading={saving}>{t("حفظ")}</Button></div>
    </form>
  );
}
