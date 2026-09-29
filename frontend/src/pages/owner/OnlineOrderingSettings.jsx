/* ==========================================================================
   OnlineOrderingSettings.jsx — «الطلب أونلاين» (settings popup tab).
   Enable / pause, pickup & delivery, prep time, ordering hours, public link
   + QR, delivery zones (fee, minimum order). Premium plan.
   ========================================================================== */
import { useEffect, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { getOnlineOrderingSettings, saveOnlineOrderingSettings } from "../../api/outsideOrders";
import { errorText } from "../../utils/errors";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { useToast } from "../../components/ui/Toast";

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
  const [data, setData] = useState(null);
  const [s, setS] = useState(null);
  const [zones, setZones] = useState([]);
  const [saving, setSaving] = useState(false);
  const load = () => getOnlineOrderingSettings().then((d) => { setData(d); setS(d.settings); setZones(d.zones.map((z) => ({ ...z }))); }).catch((e) => toast.error(errorText(e)));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const d = await saveOnlineOrderingSettings({ enabled: !!s.enabled, paused: !!s.paused, pickup_enabled: !!s.pickup_enabled, delivery_enabled: !!s.delivery_enabled, prep_minutes: Number(s.prep_minutes) || 20, opens_at: s.opens_at || null, closes_at: s.closes_at || null, slug: s.slug, zones: zones.filter((z) => z.name).map((z) => ({ name: z.name, fee: Number(z.fee) || 0, min_order: Number(z.min_order) || 0, active: z.active !== false })) });
      setData(d); setS(d.settings); setZones(d.zones); toast.success("حُفظت إعدادات الطلب أونلاين.");
    } catch (err) { toast.error(errorText(err, "تعذّر الحفظ.")); } finally { setSaving(false); }
  }

  if (!s) return <div className="h-40 animate-pulse rounded-2xl bg-black/[0.05]" />;
  const set = (k) => (v) => setS((x) => ({ ...x, [k]: v }));
  return (
    <form onSubmit={save} className="space-y-5">
      <div><h2 className="text-xl font-extrabold">الطلب أونلاين (استلام وتوصيل)</h2><p className="mt-1 text-sm text-muted">شارك رابط مطعمك ليطلب الزبائن من البيت، بلا أي عمولة.</p></div>
      {!data.plan_allows && <Alert tone="warning" title="ميزة الخطة المميزة">فعّل الخطة المميزة ليستقبل مطعمك طلبات الاستلام والتوصيل. يمكنك تجهيز الإعدادات الآن.</Alert>}

      <div className="rounded-xl bg-surface-2 p-4">
        <p className="text-xs font-bold text-muted">رابط الطلب</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span dir="ltr" className="num break-all text-sm font-bold">{data.public_url}</span>
          <button type="button" onClick={() => navigator.clipboard?.writeText(data.public_url).then(() => toast.success("نُسخ الرابط."))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-ink/[0.06]" aria-label="نسخ الرابط"><Copy size={15} /></button>
          <a href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=16&data=${encodeURIComponent(data.public_url)}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-copper-ink underline-offset-4 hover:underline">رمز QR للطباعة</a>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle label="تشغيل الطلب أونلاين" checked={s.enabled} onChange={set("enabled")} />
        <Toggle label="مشغول الآن" hint="إيقاف مؤقت دون إخفاء المنيو" checked={s.paused} onChange={set("paused")} />
        <Toggle label="الاستلام من المطعم" checked={s.pickup_enabled} onChange={set("pickup_enabled")} />
        <Toggle label="التوصيل" hint="بسائقي المطعم" checked={s.delivery_enabled} onChange={set("delivery_enabled")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Input label="وقت التحضير (دقيقة)" type="number" min="5" max="240" value={s.prep_minutes} onChange={(e) => set("prep_minutes")(e.target.value)} />
        <Input label="يبدأ الطلب" type="time" value={s.opens_at || ""} onChange={(e) => set("opens_at")(e.target.value)} hint="فارغ = طوال الوقت" />
        <Input label="ينتهي الطلب" type="time" value={s.closes_at || ""} onChange={(e) => set("closes_at")(e.target.value)} />
      </div>
      <Input label="رابط المطعم (بالإنجليزية)" dir="ltr" value={s.slug} onChange={(e) => set("slug")(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} hint="أحرف إنجليزية وأرقام وشرطة" />

      {Boolean(s.delivery_enabled) && (
        <fieldset>
          <legend className="mb-2 text-sm font-extrabold">مناطق التوصيل</legend>
          <div className="space-y-2">
            {zones.map((z, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_110px_40px] items-center gap-2">
                <input aria-label="المنطقة" placeholder="اسم المنطقة" value={z.name} onChange={(e) => setZones((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="h-10 rounded-lg border border-line px-2 text-sm" />
                <input aria-label="رسوم التوصيل" type="number" min="0" step="0.5" placeholder="الرسوم" value={z.fee} onChange={(e) => setZones((l) => l.map((x, j) => (j === i ? { ...x, fee: e.target.value } : x)))} className="h-10 rounded-lg border border-line px-2 text-sm" />
                <input aria-label="الحد الأدنى" type="number" min="0" step="1" placeholder="الحد الأدنى" value={z.min_order} onChange={(e) => setZones((l) => l.map((x, j) => (j === i ? { ...x, min_order: e.target.value } : x)))} className="h-10 rounded-lg border border-line px-2 text-sm" />
                <button type="button" onClick={() => setZones((l) => l.filter((_, j) => j !== i))} aria-label="حذف المنطقة" className="grid h-10 w-10 place-items-center rounded-lg text-brick hover:bg-brick/10"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => setZones((l) => [...l, { name: "", fee: 0, min_order: 0, active: true }])}><Plus size={15} /> إضافة منطقة</Button>
        </fieldset>
      )}
      <div className="flex justify-end border-t border-line pt-4"><Button type="submit" loading={saving}>حفظ</Button></div>
    </form>
  );
}
