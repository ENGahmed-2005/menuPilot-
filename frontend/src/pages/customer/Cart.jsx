import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Send } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { submitOrder } from "../../api/orders";

export default function Cart() {
  const { items, updateQuantity, updateNote, removeItem, total, clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmitOrder() {
    setError("");
    setLoading(true);
    try {
      await submitOrder(sessionId, items.map((it) => ({ menuItemId: it.menuItemId, quantity: it.quantity, note: it.note })));
      clearCart();
      navigate(`/order-tracking?session=${sessionId}`);
    } catch (err) {
      setError(err.message || "تعذّر إرسال طلبك.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-paper-2 px-6 text-center text-ink">
        <div className="max-w-sm">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-copper/15 text-copper-deep"><ShoppingBag size={34} /></div>
          <h1 className="mt-6 text-3xl">سلتك فارغة</h1>
          <p className="mt-2 text-sm leading-6 text-ink-soft/65">لم تضف أي أطباق بعد. ارجع إلى القائمة واختر ما تشتهي.</p>
          <button onClick={() => navigate(-1)} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-bold text-paper"><ArrowRight size={17} /> العودة للقائمة</button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-paper-2 pb-36 text-ink">
      <header className="bg-ink text-paper">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-5 py-6 sm:px-8">
          <button onClick={() => navigate(-1)} aria-label="العودة" className="grid h-10 w-10 place-items-center rounded-xl border border-paper/10 bg-paper/5"><ArrowRight size={19} /></button>
          <div><p className="text-xs text-paper/45">مراجعة الطلب</p><h1 className="mt-0.5 text-3xl">سلتك</h1></div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
        {error && <p role="alert" className="mb-5 rounded-2xl border border-brick/15 bg-brick/10 px-4 py-3 text-sm text-brick">{error}</p>}
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl">الأطباق المختارة</h2><span className="rounded-full bg-ink/5 px-3 py-1 text-xs text-ink-soft">{items.length} أصناف</span></div>

        <ul className="space-y-3">
          {items.map((it, i) => (
            <li key={i} className="rounded-3xl border border-ink/10 bg-paper p-4 shadow-sm">
              <div className="flex gap-4">
                {it.imageUrl ? <img src={it.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" /> : <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-copper/10 text-copper"><ShoppingBag size={24} /></div>}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3"><h3 className="truncate text-lg">{it.name}</h3><button onClick={() => removeItem(i)} aria-label={`إزالة ${it.name}`} className="text-brick/70 hover:text-brick"><Trash2 size={18} /></button></div>
                  <p className="mt-1 text-sm font-bold text-copper-deep">{(Number(it.price) * Number(it.quantity)).toFixed(2)} ₪</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 rounded-xl bg-ink px-2 py-1.5 text-paper"><button onClick={() => updateQuantity(i, Math.max(1, it.quantity - 1))} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-paper/10"><Minus size={15} /></button><b className="min-w-5 text-center text-sm">{it.quantity}</b><button onClick={() => updateQuantity(i, it.quantity + 1)} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-paper/10"><Plus size={15} /></button></div>
                  </div>
                </div>
              </div>
              <input placeholder="أضف ملاحظة للطبق (اختياري)" value={it.note} onChange={(e) => updateNote(i, e.target.value)} className="mt-4 w-full rounded-2xl border border-ink/10 bg-paper-2 px-4 py-3 text-sm outline-none transition focus:border-copper focus:ring-2 focus:ring-copper/15" />
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-3xl border border-ink/10 bg-paper p-5 shadow-sm">
          <div className="flex items-center justify-between text-sm text-ink-soft"><span>المجموع</span><span>{total.toFixed(2)} ₪</span></div>
          <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-4"><span className="font-bold">الإجمالي</span><strong className="text-2xl text-copper-deep">{total.toFixed(2)} ₪</strong></div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper-2/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1"><p className="text-xs text-ink-soft/60">الإجمالي</p><strong className="text-xl text-copper-deep">{total.toFixed(2)} ₪</strong></div>
          <button onClick={handleSubmitOrder} disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-copper py-3.5 text-sm font-black text-ink shadow-lg shadow-copper/10 transition hover:bg-copper-deep disabled:cursor-not-allowed disabled:opacity-50"><Send size={17} />{loading ? "جارِ إرسال الطلب…" : "تأكيد وإرسال الطلب"}</button>
        </div>
      </div>
    </div>
  );
}
