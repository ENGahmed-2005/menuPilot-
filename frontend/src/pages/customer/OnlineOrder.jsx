/* ==========================================================================
   OnlineOrder.jsx — public ordering page (route /r/:slug).
   Menu → cart → checkout (pickup or delivery, cash or bank transfer with a
   receipt) → tracking page. No login; totals, fees and the minimum order
   are checked by the API. Separate cart from dine-in so the two never mix.
   ========================================================================== */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bike, Minus, Plus, ShoppingBag, Store, Utensils } from "lucide-react";
import { getOnlineRestaurant, placeOnlineOrder } from "../../api/outsideOrders";
import { errorText } from "../../utils/errors";
import { money } from "../../utils/format";
import Modal from "../../components/ui/Modal";
import BrandLogo from "../../components/brand/Logo";
import { waLink } from "../../utils/whatsapp";

export default function OnlineOrder() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState({}); // id → quantity
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ type: "pickup", name: "", phone: "", zone_id: "", address: "", notes: "", payment_method: "cash", proof: "" });
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => { getOnlineRestaurant(slug).then((d) => { setData(d); setForm((f) => ({ ...f, type: d.pickup ? "pickup" : "delivery" })); }).catch(setError); }, [slug]);

  const items = data?.items || [];
  const lines = useMemo(() => items.filter((i) => cart[i.id]).map((i) => ({ ...i, quantity: cart[i.id] })), [items, cart]);
  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const zone = data?.zones?.find((z) => String(z.id) === String(form.zone_id));
  const fee = form.type === "delivery" && zone ? Number(zone.fee) : 0;
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const groups = useMemo(() => { const g = new Map(); items.forEach((i) => { const k = i.category || "أصناف"; g.set(k, [...(g.get(k) || []), i]); }); return [...g.entries()]; }, [items]);
  const setQty = (id, q) => setCart((c) => { const n = { ...c }; if (q <= 0) delete n[id]; else n[id] = Math.min(50, q); return n; });
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
      const o = await placeOnlineOrder(slug, { ...form, zone_id: form.type === "delivery" ? Number(form.zone_id) || null : null, proof: form.payment_method === "transfer" ? form.proof : undefined, items: lines.map((l) => ({ menuItemId: l.id, quantity: l.quantity })) });
      navigate(`/o/${o.id}?token=${encodeURIComponent(o.token)}`);
    } catch (err) {
      setFormError(errorText(err, "تعذّر إرسال الطلب."));
    } finally {
      setSending(false);
    }
  }

  if (error) return <main dir="rtl" className="grid min-h-screen place-items-center bg-paper-2 p-6 text-center text-ink"><div><Utensils className="mx-auto text-muted" /><p className="mt-3 font-bold">{errorText(error, "هذا المطعم لا يستقبل طلبات أونلاين حاليًا.")}</p></div></main>;
  if (!data) return <main dir="rtl" className="min-h-screen bg-paper-2 p-4"><div className="mx-auto max-w-3xl space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-black/[0.06]" />)}</div></main>;

  return (
    <main dir="rtl" className={`min-h-screen bg-paper-2 text-ink ${count ? "pb-28" : "pb-10"}`}>
      <header className="bg-navy text-paper">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-6">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white">{data.restaurant.logo_url ? <img src={data.restaurant.logo_url} alt="" className="h-full w-full object-cover" /> : <Utensils className="text-navy" aria-hidden="true" />}</div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black">{data.restaurant.name}</h1>
            <p className="mt-1 flex flex-wrap gap-2 text-xs font-bold">
              <span className={`rounded-full px-2 py-0.5 ${data.open ? "bg-herb text-white" : "bg-brick text-white"}`}>{data.open ? "يستقبل الطلبات الآن" : data.paused ? "مشغول حاليًا" : "مغلق الآن"}</span>
              {data.pickup && <span className="rounded-full bg-paper/15 px-2 py-0.5">استلام</span>}
              {data.delivery && <span className="rounded-full bg-paper/15 px-2 py-0.5">توصيل</span>}
              <span className="rounded-full bg-paper/15 px-2 py-0.5">التحضير ≈ {data.prep_minutes} د</span>
              {data.restaurant.whatsapp && <a href={waLink(data.restaurant.whatsapp, `مرحبًا ${data.restaurant.name}، عندي استفسار عن الطلب أونلاين.`)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#1f9d55] px-2 py-0.5 text-white">واتساب</a>}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4">
        {!data.open && <p className="mt-4 rounded-2xl bg-copper/10 p-3 text-sm font-bold text-copper-ink">لا يستقبل المطعم طلبات الآن{data.hours ? ` (ساعات الطلب ${data.hours.opens_at}–${data.hours.closes_at})` : ""}. يمكنك تصفح المنيو.</p>}
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
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="num font-black text-copper-ink">{money(i.price)}</span>
                      {cart[i.id] ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.05] p-1">
                          <button onClick={() => setQty(i.id, cart[i.id] - 1)} aria-label={`إنقاص ${i.name}`} className="grid h-9 w-9 place-items-center rounded-full bg-white"><Minus size={15} /></button>
                          <b className="num min-w-6 text-center">{cart[i.id]}</b>
                          <button onClick={() => setQty(i.id, cart[i.id] + 1)} aria-label={`زيادة ${i.name}`} className="grid h-9 w-9 place-items-center rounded-full bg-navy text-paper"><Plus size={15} /></button>
                        </span>
                      ) : (
                        <button disabled={!data.open} onClick={() => setQty(i.id, 1)} aria-label={`إضافة ${i.name}`} className="grid h-10 w-10 place-items-center rounded-full bg-navy text-paper disabled:opacity-40"><Plus size={18} /></button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <a href="/" className="mx-auto mt-10 flex w-fit items-center gap-2 text-xs font-bold opacity-60" dir="ltr">Powered by <BrandLogo height={20} /></a>
      </div>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2">
          <button onClick={() => setCheckout(true)} className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between rounded-2xl bg-navy px-5 text-paper shadow-xl">
            <span className="grid h-8 min-w-8 place-items-center rounded-full bg-paper/20 px-2 text-sm font-black">{count}</span>
            <span className="text-base font-black">إتمام الطلب</span>
            <span className="num text-base font-black">{money(subtotal)}</span>
          </button>
        </div>
      )}

      <Modal open={checkout} onClose={() => !sending && setCheckout(false)} title="إتمام الطلب" size="md">
        <form onSubmit={submit} className="space-y-4 text-ink">
          <div className="grid grid-cols-2 gap-2">
            {data.pickup && <button type="button" onClick={() => setForm((f) => ({ ...f, type: "pickup" }))} aria-pressed={form.type === "pickup"} className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-bold ${form.type === "pickup" ? "border-copper bg-copper/10" : "border-line"}`}><Store size={17} /> استلام</button>}
            {data.delivery && <button type="button" onClick={() => setForm((f) => ({ ...f, type: "delivery" }))} aria-pressed={form.type === "delivery"} className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-bold ${form.type === "delivery" ? "border-copper bg-copper/10" : "border-line"}`}><Bike size={17} /> توصيل</button>}
          </div>
          <label className="block text-sm font-bold">الاسم<input required maxLength={120} {...field("name")} className="mt-1.5 h-11 w-full rounded-xl border border-line px-3 font-normal" /></label>
          <label className="block text-sm font-bold">رقم الهاتف<input required type="tel" dir="ltr" placeholder="0599 000 000" {...field("phone")} className="mt-1.5 h-11 w-full rounded-xl border border-line px-3 font-normal" /></label>
          {form.type === "delivery" && (<>
            <label className="block text-sm font-bold">منطقة التوصيل
              <select required {...field("zone_id")} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-3 font-normal">
                <option value="">اختر المنطقة</option>
                {data.zones.map((z) => <option key={z.id} value={z.id}>{z.name} · التوصيل {money(z.fee)}{Number(z.min_order) ? ` · الحد الأدنى ${money(z.min_order)}` : ""}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold">العنوان<textarea required rows={2} maxLength={500} {...field("address")} className="mt-1.5 w-full rounded-xl border border-line px-3 py-2 font-normal" /></label>
          </>)}
          <label className="block text-sm font-bold">ملاحظات (اختياري)<input maxLength={500} {...field("notes")} className="mt-1.5 h-11 w-full rounded-xl border border-line px-3 font-normal" /></label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-bold">الدفع</legend>
            {[["cash", form.type === "delivery" ? "نقدًا عند التوصيل" : "نقدًا عند الاستلام"], ["transfer", "تحويل مسبق (أرفق الإشعار)"]].map(([v, l]) => (
              <label key={v} className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm font-bold ${form.payment_method === v ? "border-copper bg-copper/[0.06]" : "border-line"}`}>
                <input type="radio" name="pm" checked={form.payment_method === v} onChange={() => setForm((f) => ({ ...f, payment_method: v }))} /> {l}
              </label>
            ))}
            {form.payment_method === "transfer" && <input type="file" required accept="image/png,image/jpeg,image/webp" onChange={pickProof} className="text-sm" />}
          </fieldset>
          <dl className="space-y-1 rounded-xl bg-surface-2 p-3 text-sm">
            <div className="flex justify-between"><dt>الأصناف</dt><dd className="num">{money(subtotal)}</dd></div>
            {form.type === "delivery" && <div className="flex justify-between"><dt>التوصيل</dt><dd className="num">{zone ? money(fee) : "—"}</dd></div>}
            <div className="flex justify-between text-base font-black"><dt>الإجمالي</dt><dd className="num">{money(subtotal + fee)}</dd></div>
          </dl>
          {formError && <p role="alert" className="rounded-xl bg-brick/10 p-3 text-sm font-bold text-brick">{formError}</p>}
          <button type="submit" disabled={sending} className="h-12 w-full rounded-2xl bg-copper text-base font-black text-ink disabled:opacity-60">{sending ? "جارٍ الإرسال…" : `إرسال الطلب · ${money(subtotal + fee)}`}</button>
          <p className="text-center text-xs text-muted">يؤكد المطعم طلبك ويحدد وقت التحضير، وتتابع الحالة من رابط التتبع.</p>
        </form>
      </Modal>
    </main>
  );
}
