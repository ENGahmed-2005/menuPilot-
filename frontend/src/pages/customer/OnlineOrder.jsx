/* ==========================================================================
   OnlineOrder.jsx — public ordering page (route /r/:slug).
   Menu → cart → checkout (pickup or delivery, cash or bank transfer with a
   receipt) → tracking page. No login; totals, fees and the minimum order
   are checked by the API. Separate cart from dine-in so the two never mix.
   Dishes with paid extras open the shared ProductSheet; each dish + extras
   + note is its own cart line, priced (for display) with its extras.
   ========================================================================== */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bike, LocateFixed, Minus, Plus, ShoppingBag, Store, Utensils, X } from "lucide-react";
import { getOnlineRestaurant, placeOnlineOrder } from "../../api/outsideOrders";
import { errorText } from "../../utils/errors";
import { money } from "../../utils/format";
import Modal from "../../components/ui/Modal";
import BrandLogo from "../../components/brand/Logo";
import { waLink } from "../../utils/whatsapp";
import { currentPosition } from "../../utils/maps";
import LocationMap from "../../components/delivery/LocationMap";
import ProductSheet from "../../components/menu/ProductSheet";
import ItemOptions from "../../components/orders/ItemOptions";
import { lineKey, toOrderItem, unitPrice } from "../../components/menu/cartLine";
import { t, dir } from "../../i18n";

// This page wears menuPilot's colours, so the dish sheet does too.
const SHEET_BRAND = { primary_color: "#B8793E", button_color: "#1F2D3D" };

export default function OnlineOrder() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState({}); // line key → { item, options, note, quantity }
  const [sheetItem, setSheetItem] = useState(null);
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ type: "pickup", name: "", phone: "", zone_id: "", address: "", notes: "", payment_method: "cash", proof: "" });
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState(null);
  const [loc, setLoc] = useState(null); // { lat, lng, accuracy } shared from the phone
  const [locating, setLocating] = useState(false);
  async function shareLocation() {
    setLocating(true); setFormError(null);
    try { setLoc(await currentPosition()); } catch (e) { setFormError(e.message); } finally { setLocating(false); }
  }

  useEffect(() => { getOnlineRestaurant(slug).then((d) => { setData(d); setForm((f) => ({ ...f, type: d.pickup ? "pickup" : "delivery" })); }).catch(setError); }, [slug]);

  const items = data?.items || [];
  const lines = useMemo(() => Object.entries(cart).map(([key, l]) => ({ key, ...l, unit: unitPrice(l.item.price, l.options) })), [cart]);
  const subtotal = lines.reduce((s, l) => s + l.unit * l.quantity, 0);
  const zone = data?.zones?.find((z) => String(z.id) === String(form.zone_id));
  const fee = form.type === "delivery" && zone ? Number(zone.fee) : 0;
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  // Delivery minimum applies to the items (not the delivery fee) — same rule as the server.
  const minOrder = form.type === "delivery" && zone ? Number(zone.min_order) || 0 : 0;
  const missing = Math.max(0, Math.round((minOrder - subtotal) * 100) / 100);
  const groups = useMemo(() => { const g = new Map(); items.forEach((i) => { const k = i.category || t("أصناف"); g.set(k, [...(g.get(k) || []), i]); }); return [...g.entries()]; }, [items]);
  const MAX_QTY = 50;
  const addLine = (item, quantity = 1, note = "", options = []) => setCart((c) => {
    const key = lineKey(item.id, options, note);
    return { ...c, [key]: { item, options, note, quantity: Math.min(MAX_QTY, (c[key]?.quantity || 0) + quantity) } };
  });
  const setQty = (key, q) => setCart((c) => { const n = { ...c }; if (q <= 0) delete n[key]; else n[key] = { ...n[key], quantity: Math.min(MAX_QTY, q) }; return n; });
  // A dish without extras is changed right on its card (its plain line).
  const plainKey = (item) => lineKey(item.id, [], "");
  const dishCount = (item) => lines.filter((l) => l.item.id === item.id).reduce((s, l) => s + l.quantity, 0);
  const field = (k) => ({ value: form[k], onChange: (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setFormError(null); } });

  function pickProof(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, proof: reader.result }));
    reader.readAsDataURL(file);
  }

  async function submit(e) {
    e.preventDefault();
    setSending(true);
    try {
      const o = await placeOnlineOrder(slug, { ...form, zone_id: form.type === "delivery" ? Number(form.zone_id) || null : null, proof: form.payment_method === "transfer" ? form.proof : undefined, ...(form.type === "delivery" && loc ? { latitude: loc.lat, longitude: loc.lng, location_accuracy: loc.accuracy } : {}), items: lines.map((l) => toOrderItem({ menuItemId: l.item.id, quantity: l.quantity, note: l.note, options: l.options })) });
      navigate(`/o/${o.id}?token=${encodeURIComponent(o.token)}`);
    } catch (err) {
      setFormError(errorText(err, t("تعذّر إرسال الطلب.")));
    } finally {
      setSending(false);
    }
  }

  if (error) return <main dir={dir} className="grid min-h-screen place-items-center bg-paper-2 p-6 text-center text-ink"><div><Utensils className="mx-auto text-muted" /><p className="mt-3 font-bold">{errorText(error, t("هذا المطعم لا يستقبل طلبات أونلاين حاليًا."))}</p></div></main>;
  if (!data) return <main dir={dir} className="min-h-screen bg-paper-2 p-4"><div className="mx-auto max-w-3xl space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-black/[0.06]" />)}</div></main>;

  return (
    <main dir={dir} className={`min-h-screen bg-paper-2 text-ink ${count ? "pb-28" : "pb-10"}`}>
      <header className="bg-navy text-paper">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-6">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white">{data.restaurant.logo_url ? <img src={data.restaurant.logo_url} alt="" className="h-full w-full object-cover" /> : <Utensils className="text-navy" aria-hidden="true" />}</div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black">{data.restaurant.name}</h1>
            <p className="mt-1 flex flex-wrap gap-2 text-xs font-bold">
              <span className={`rounded-full px-2 py-0.5 ${data.open ? "bg-herb text-white" : "bg-brick text-white"}`}>{data.open ? t("يستقبل الطلبات الآن") : data.paused ? t("مشغول حاليًا") : t("مغلق الآن")}</span>
              {data.pickup && <span className="rounded-full bg-paper/15 px-2 py-0.5">{t("استلام")}</span>}
              {data.delivery && <span className="rounded-full bg-paper/15 px-2 py-0.5">{t("توصيل")}</span>}
              <span className="rounded-full bg-paper/15 px-2 py-0.5">{t("التحضير ≈")} {data.prep_minutes} {t("د")}</span>
              {data.restaurant.whatsapp && <a href={waLink(data.restaurant.whatsapp, t("مرحبًا {0}، عندي استفسار عن الطلب أونلاين.", { 0: data.restaurant.name }))} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#1f9d55] px-2 py-0.5 text-white">{t("واتساب")}</a>}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4">
        {!data.open && <p className="mt-4 rounded-2xl bg-copper/10 p-3 text-sm font-bold text-copper-ink">{t("لا يستقبل المطعم طلبات الآن")}{data.hours ? t(" (ساعات الطلب {0}–{1})", { 0: data.hours.opens_at, 1: data.hours.closes_at }) : ""}{t(". يمكنك تصفح المنيو.")}</p>}
        {groups.map(([cat, list]) => (
          <section key={cat} className="mt-6">
            <h2 className="mb-3 text-lg font-black">{cat}</h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {list.map((i) => (
                <li key={i.id} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
                  {i.imageUrl ? <img src={i.imageUrl} alt={i.name} loading="lazy" className="h-24 w-24 shrink-0 rounded-xl object-cover" /> : <div className="grid h-24 w-24 shrink-0 place-items-center rounded-xl bg-copper/10"><Utensils className="text-copper-ink" aria-hidden="true" /></div>}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="font-black">{i.name}</p>
                    {i.description && <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted">{i.description}</p>}
                    {i.options?.length > 0 && <p className="mt-0.5 text-xs font-bold text-copper-ink">{t("إضافات حسب الطلب")}</p>}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="num font-black text-copper-ink">{money(i.price)}</span>
                      {i.options?.length ? (
                        // Extras to choose: the sheet adds a line each time.
                        <button disabled={!data.open} onClick={() => setSheetItem(i)} aria-label={t("إضافة {0}", { 0: i.name })} className="relative grid h-10 w-10 place-items-center rounded-full bg-navy text-paper disabled:opacity-40">
                          <Plus size={18} />
                          {dishCount(i) > 0 && <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-copper px-1 text-xs font-black text-ink">{dishCount(i)}</span>}
                        </button>
                      ) : cart[plainKey(i)] ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.05] p-1">
                          <button onClick={() => setQty(plainKey(i), cart[plainKey(i)].quantity - 1)} aria-label={t("إنقاص {0}", { 0: i.name })} className="grid h-9 w-9 place-items-center rounded-full bg-white"><Minus size={15} /></button>
                          <b className="num min-w-6 text-center">{cart[plainKey(i)].quantity}</b>
                          <button onClick={() => setQty(plainKey(i), cart[plainKey(i)].quantity + 1)} aria-label={t("زيادة {0}", { 0: i.name })} className="grid h-9 w-9 place-items-center rounded-full bg-navy text-paper"><Plus size={15} /></button>
                        </span>
                      ) : (
                        <button disabled={!data.open} onClick={() => addLine(i)} aria-label={t("إضافة {0}", { 0: i.name })} className="grid h-10 w-10 place-items-center rounded-full bg-navy text-paper disabled:opacity-40"><Plus size={18} /></button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <a href="/" className="mx-auto mt-10 flex w-fit items-center gap-2 text-xs font-bold opacity-60" dir={dir}>{t("مدعوم من")} <BrandLogo height={20} /></a>
      </div>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2">
          <button onClick={() => setCheckout(true)} className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between rounded-2xl bg-navy px-5 text-paper shadow-xl">
            <span className="grid h-8 min-w-8 place-items-center rounded-full bg-paper/20 px-2 text-sm font-black">{count}</span>
            <span className="text-base font-black">{t("إتمام الطلب")}</span>
            <span className="num text-base font-black">{money(subtotal)}</span>
          </button>
        </div>
      )}

      <Modal open={checkout} onClose={() => !sending && setCheckout(false)} title={t("إتمام الطلب")} size="md">
        <form onSubmit={submit} className="space-y-4 text-ink">
          {/* Every line, with its extras: dishes with extras are changed here. */}
          <ul className="divide-y divide-line rounded-xl border border-line">
            {lines.map((l) => (
              <li key={l.key} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-bold">{l.item.name}</p>
                  <ItemOptions options={l.options} />
                  {l.note && <p className="text-xs text-muted">{l.note}</p>}
                  <p className="num text-xs font-bold text-copper-ink">{money(l.unit * l.quantity)}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/[0.05] p-1">
                  <button type="button" onClick={() => setQty(l.key, l.quantity - 1)} aria-label={t("إنقاص {0}", { 0: l.item.name })} className="grid h-9 w-9 place-items-center rounded-full bg-white"><Minus size={15} /></button>
                  <b className="num min-w-6 text-center">{l.quantity}</b>
                  <button type="button" onClick={() => setQty(l.key, l.quantity + 1)} aria-label={t("زيادة {0}", { 0: l.item.name })} className="grid h-9 w-9 place-items-center rounded-full bg-navy text-paper"><Plus size={15} /></button>
                </span>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            {data.pickup && <button type="button" onClick={() => setForm((f) => ({ ...f, type: "pickup" }))} aria-pressed={form.type === "pickup"} className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-bold ${form.type === "pickup" ? "border-copper bg-copper/10" : "border-line"}`}><Store size={17} /> {t("استلام")}</button>}
            {data.delivery && <button type="button" onClick={() => setForm((f) => ({ ...f, type: "delivery" }))} aria-pressed={form.type === "delivery"} className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-bold ${form.type === "delivery" ? "border-copper bg-copper/10" : "border-line"}`}><Bike size={17} /> {t("توصيل")}</button>}
          </div>
          <label className="block text-sm font-bold">{t("الاسم")}<input required maxLength={120} {...field("name")} className="mt-1.5 h-11 w-full rounded-xl border border-line px-3 font-normal" /></label>
          <label className="block text-sm font-bold">{t("رقم الهاتف")}<input required type="tel" dir="ltr" placeholder="0599 000 000" {...field("phone")} className="mt-1.5 h-11 w-full rounded-xl border border-line px-3 font-normal" /></label>
          {form.type === "delivery" && (<>
            <label className="block text-sm font-bold">{t("منطقة التوصيل")}
              <select required {...field("zone_id")} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 font-normal">
                <option value="">{t("اختر المنطقة")}</option>
                {data.zones.map((z) => <option key={z.id} value={z.id}>{z.name} {t("· التوصيل")} {money(z.fee)}{Number(z.min_order) ? t(" · الحد الأدنى {0}", { 0: money(z.min_order) }) : ""}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold">{t("العنوان بالتفصيل")}<textarea required rows={2} maxLength={500} placeholder={t("الحي، الشارع، أقرب معلم، رقم العمارة والطابق")} {...field("address")} className="mt-1.5 w-full rounded-xl border border-line px-3 py-2 font-normal" /></label>
            <div className="rounded-xl border border-dashed border-line p-3">
              {loc ? (
                <div className="space-y-2">
                  <LocationMap lat={loc.lat} lng={loc.lng} height={150} title={t("موقعك على الخريطة")} />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-herb">{t("تمت إضافة موقعك")}{loc.accuracy ? t(" · الدقة ≈ {0} م", { 0: loc.accuracy }) : ""}</span>
                    <button type="button" onClick={() => setLoc(null)} className="inline-flex items-center gap-1 font-bold text-muted"><X size={13} /> {t("إزالة")}</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={shareLocation} disabled={locating} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-navy text-sm font-bold text-paper disabled:opacity-60">
                  <LocateFixed size={17} aria-hidden="true" /> {locating ? t("جارٍ تحديد موقعك…") : t("استخدم موقعي الحالي (اختياري)")}
                </button>
              )}
              <p className="mt-2 text-[11px] leading-5 text-muted">{t("يساعد السائق على الوصول بدقة، ولا يراه إلا المطعم.")}</p>
            </div>
          </>)}
          <label className="block text-sm font-bold">{t("ملاحظات (اختياري)")}<input maxLength={500} {...field("notes")} className="mt-1.5 h-11 w-full rounded-xl border border-line px-3 font-normal" /></label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-bold">{t("الدفع")}</legend>
            {[["cash", form.type === "delivery" ? t("نقدًا عند التوصيل") : t("نقدًا عند الاستلام")], ["transfer", t("تحويل مسبق (أرفق الإشعار)")]].map(([v, l]) => (
              <label key={v} className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm font-bold ${form.payment_method === v ? "border-copper bg-copper/[0.06]" : "border-line"}`}>
                <input type="radio" name="pm" checked={form.payment_method === v} onChange={() => setForm((f) => ({ ...f, payment_method: v }))} /> {l}
              </label>
            ))}
            {form.payment_method === "transfer" && <input type="file" required accept="image/png,image/jpeg,image/webp" onChange={pickProof} className="text-sm" />}
          </fieldset>
          <dl className="space-y-1 rounded-xl bg-surface-2 p-3 text-sm">
            <div className="flex justify-between"><dt>{t("الأصناف")}</dt><dd className="num">{money(subtotal)}</dd></div>
            {form.type === "delivery" && <div className="flex justify-between"><dt>{t("التوصيل")}</dt><dd className="num">{zone ? money(fee) : "—"}</dd></div>}
            <div className="flex justify-between text-base font-black"><dt>{t("الإجمالي")}</dt><dd className="num">{money(subtotal + fee)}</dd></div>
          </dl>
          {missing > 0 && (
            <p role="status" className="rounded-xl bg-copper/10 p-3 text-sm font-bold text-copper-ink">
              {t("الحد الأدنى للتوصيل إلى")} {zone.name} {t("هو")} <span className="num">{money(minOrder)}</span> {t("(دون رسوم التوصيل). أضف أصنافًا بقيمة")} <span className="num">{money(missing)}</span>.
            </p>
          )}
          {formError && <p role="alert" className="rounded-xl bg-brick/10 p-3 text-sm font-bold text-brick">{formError}</p>}
          <button type="submit" disabled={sending || missing > 0} className="h-12 w-full rounded-2xl bg-copper text-base font-black text-ink disabled:opacity-60">{sending ? t("جارٍ الإرسال…") : t("إرسال الطلب · {0}", { 0: money(subtotal + fee) })}</button>
          <p className="text-center text-xs text-muted">{t("يؤكد المطعم طلبك ويحدد وقت التحضير، وتتابع الحالة من رابط التتبع.")}</p>
        </form>
      </Modal>

      <ProductSheet key={sheetItem?.id} item={sheetItem} brand={SHEET_BRAND} onClose={() => setSheetItem(null)}
        onAdd={({ quantity, note, options }) => { addLine(sheetItem, quantity, note, options); setSheetItem(null); }} />
    </main>
  );
}
