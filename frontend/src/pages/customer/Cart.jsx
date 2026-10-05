import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ArrowLeft, MapPin } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useEffect, useState } from "react";
import { getSession, openSession } from "../../api/sessions";
import { forgetTableSession, tableSession } from "../../utils/tableSession";
import { openSessionError } from "../../utils/sessionErrors";
import { submitOrder } from "../../api/orders";
import { errorText } from "../../utils/errors";
import { AR, countAr } from "../../utils/plural";
import { t, dir } from "../../i18n";
import ItemOptions from "../../components/orders/ItemOptions";
import { toOrderItem } from "../../components/menu/cartLine";

export default function Cart() {
  const { items, updateQuantity, updateNote, removeItem, total, clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const { tableCode } = useParams();
  // The guest browsed without a session; it's opened here, with the first order.
  const [sessionId, setSessionId] = useState(() => searchParams.get("session") || tableSession(tableCode));
  const [guest, setGuest] = useState({ name: "", phone: "" });
  const navigate = useNavigate();
  const menuPath = `/t/${tableCode}/menu${sessionId ? `?session=${encodeURIComponent(sessionId)}` : ""}`;

  // Restaurant choice: pay before the kitchen prepares (default) or after eating.
  const [timing, setTiming] = useState("before");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId).then((s) => {
      // A session the cashier already closed can't take orders: open a new one.
      if (s?.is_closed || s?.closed_at || s?.status === "closed") { forgetTableSession(tableCode); setSessionId(null); return; }
      setTiming(s?.payment_timing || "before");
    }).catch((err) => { if (err?.status === 404 || err?.status === 403) { forgetTableSession(tableCode); setSessionId(null); } });
  }, [sessionId, tableCode]);
  const payAfter = timing === "after";

  async function continueToPayment() {
    setSendError("");
    let id = sessionId;
    let after = payAfter;
    if (!id) {
      const name = guest.name.trim(), phone = guest.phone.trim();
      if (name.length < 2) { setSendError(t("اكتب اسمًا صحيحًا للمتابعة.")); return; }
      if (phone.length < 7) { setSendError(t("أدخل رقم جوال صحيحًا للمتابعة.")); return; }
      setSending(true);
      try {
        // Asks for the location once, checks the guest is inside, opens the table.
        const opened = await openSession({ tableCode, name, phone });
        if (!opened?.id) throw new Error(t("تم فتح الجلسة لكن لم يصل رقم الجلسة. حاول مرة أخرى."));
        id = opened.id;
        setSessionId(opened.id);
        const full = await getSession(opened.id).catch(() => opened);
        after = (full?.payment_timing || "before") === "after";
        setTiming(full?.payment_timing || "before");
      } catch (err) {
        setSendError(openSessionError(err));
        setSending(false);
        return;
      }
    }
    if (!after) { navigate(`/t/${tableCode}/payment?session=${encodeURIComponent(id)}`); return; }
    setSending(true);
    try {
      await submitOrder(id, items.map(toOrderItem));
      clearCart();
      navigate(`/order-tracking?session=${encodeURIComponent(id)}`, { replace: true });
    } catch (err) {
      setSendError(errorText(err, t("تعذّر إرسال الطلب.")));
    } finally {
      setSending(false);
    }
  }

  if (items.length === 0) return <div dir={dir} className="grid min-h-screen place-items-center bg-paper-2 px-6 text-center text-ink"><div className="max-w-sm"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-copper/15 text-copper-ink"><ShoppingBag size={34}/></div><h1 className="mt-6 text-3xl">{t("سلتك فارغة")}</h1><p className="mt-2 text-sm leading-6 text-muted">{t("لم تضف أي أطباق بعد.")}</p><button onClick={() => navigate(menuPath)} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-navy px-5 py-3 text-sm font-bold text-paper"><ArrowRight size={17}/> {t("العودة للقائمة")}</button></div></div>;

  return <div dir={dir} className="min-h-screen bg-paper-2 pb-36 text-ink">
    <header className="bg-navy text-paper"><div className="mx-auto flex max-w-3xl items-center gap-4 px-5 py-6 sm:px-8"><button onClick={() => navigate(menuPath)} aria-label={t("العودة للقائمة")} className="grid h-10 w-10 place-items-center rounded-xl border border-paper/10 bg-paper/5"><ArrowRight size={19}/></button><div><p className="text-xs text-paper/70">{t("الخطوة 1")}</p><h1 className="mt-0.5 text-3xl font-black">{t("مراجعة السلة")}</h1></div></div></header>
    <main className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
      {!sessionId && (
        <section aria-labelledby="guest-title" className="mb-5 rounded-3xl border border-ink/10 bg-paper p-5">
          <h2 id="guest-title" className="text-lg font-black">{t("بياناتك لإرسال الطلب")}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{t("نحتاج اسمك ورقم جوالك مرة واحدة فقط لهذه الطاولة.")}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold">{t("الاسم")}
              <input value={guest.name} onChange={(e) => setGuest((g) => ({ ...g, name: e.target.value }))} autoComplete="name" maxLength={80} placeholder={t("مثلًا: أحمد")}
                className="mt-1.5 h-12 w-full rounded-2xl border border-ink/10 bg-white px-4 text-sm font-normal outline-none focus:border-copper" />
            </label>
            <label className="block text-sm font-bold">{t("رقم الجوال")}
              <input value={guest.phone} onChange={(e) => setGuest((g) => ({ ...g, phone: e.target.value }))} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" maxLength={20} placeholder="05XXXXXXXX"
                className="mt-1.5 h-12 w-full rounded-2xl border border-ink/10 bg-white px-4 text-sm font-normal outline-none focus:border-copper" />
            </label>
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted"><MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{t("عند الضغط على الزر يطلب المتصفح موقعك مرة واحدة، للتأكد أنك داخل المطعم.")}</p>
        </section>
      )}
      <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">{t("الأطباق المختارة")}</h2><span className="rounded-full bg-ink/5 px-3 py-1 text-xs text-ink-soft">{countAr(items.length, AR.dishes)}</span></div>
      <ul className="space-y-3">{items.map((it, i) => <li key={it.key ?? i} className="rounded-3xl border border-ink/10 bg-paper p-4 shadow-sm"><div className="flex gap-4">{it.imageUrl ? <img src={it.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover"/> : <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-copper/10 text-copper"><ShoppingBag size={24}/></div>}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h3 className="truncate text-lg font-bold">{it.name}</h3><button onClick={() => removeItem(i)} aria-label={t("إزالة {0} من السلة", { 0: it.name })} className="-m-2 grid h-10 w-10 place-items-center rounded-xl text-brick hover:bg-brick/10"><Trash2 size={18} aria-hidden="true"/></button></div><ItemOptions options={it.options} className="mt-0.5" /><p className="mt-1 text-sm font-bold text-copper-ink">{(Number(it.price) * Number(it.quantity)).toFixed(2)} ₪</p><div className="mt-3 flex w-fit items-center gap-1 rounded-xl bg-navy p-1 text-paper"><button onClick={() => updateQuantity(i, Math.max(1, it.quantity - 1))} disabled={it.quantity <= 1} aria-label={t("إنقاص كمية {0}", { 0: it.name })} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-paper/10 disabled:opacity-40"><Minus size={16} aria-hidden="true"/></button><b className="min-w-7 text-center text-base tabular-nums" aria-live="polite">{it.quantity}</b><button onClick={() => updateQuantity(i, it.quantity + 1)} aria-label={t("زيادة كمية {0}", { 0: it.name })} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-paper/10"><Plus size={16} aria-hidden="true"/></button></div></div></div><input aria-label={t("ملاحظة على {0}", { 0: it.name })} maxLength={500} placeholder={t("ملاحظة للمطبخ، مثل: بدون بصل (اختياري)")} value={it.note || ""} onChange={(e) => updateNote(i, e.target.value)} className="mt-4 w-full rounded-2xl border border-ink/10 bg-paper-2 px-4 py-3 text-sm outline-none focus:border-copper"/></li>)}</ul>
      <div className="mt-6 rounded-3xl border border-ink/10 bg-paper p-5 shadow-sm"><div className="flex items-center justify-between text-sm text-ink-soft"><span>{t("الإجمالي")}</span><strong className="text-2xl text-copper-ink">{total.toFixed(2)} ₪</strong></div></div>
    </main>
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper-2/95 p-4 backdrop-blur"><div className="mx-auto flex max-w-3xl items-center gap-3"><button onClick={() => navigate(menuPath)} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-paper"><ArrowRight size={18}/></button><button onClick={continueToPayment} disabled={sending} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-copper py-3.5 text-sm font-black text-ink disabled:opacity-50">{sending ? (sessionId ? t("جارٍ الإرسال…") : t("نتحقق من موقعك…")) : !sessionId ? t("تأكيد الطلب") : payAfter ? t("إرسال الطلب للمطبخ") : t("متابعة وإتمام الطلب")} <ArrowLeft size={18}/></button></div>{sendError && <p role="alert" className="mx-auto mt-2 max-w-3xl rounded-xl bg-brick/10 p-2 text-center text-xs font-bold text-brick">{sendError}</p>}{sessionId && payAfter && !sendError && <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted">{t("تدفع في النهاية من «طلب الفاتورة».")}</p>}</div>
  </div>;
}
