/* ==========================================================================
   Cart.jsx — مراجعة السلة قبل الإرسال. FR-15 (المراجعة) + FR-16 (الإرسال).
   ========================================================================== */
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
      await submitOrder(
        sessionId,
        items.map((it) => ({ menuItemId: it.menuItemId, quantity: it.quantity, note: it.note }))
      );
      clearCart();
      navigate(`/order-tracking?session=${sessionId}`);
    } catch (err) {
      setError(err.message || "تعذّر إرسال طلبك.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0)
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-2 px-6 text-center">
        <p className="text-sm text-ink-soft">سلتك فارغة.</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-paper-2 pb-28 text-ink">
      <header className="bg-ink px-5 py-6 text-paper sm:px-8">
        <h1 className="font-display text-3xl">طلبك</h1>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-6 sm:px-8">
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-brick/10 px-3 py-2 text-sm text-brick">
            {error}
          </p>
        )}

        <ul className="divide-y divide-ink/10">
          {items.map((it, i) => (
            <li key={i} className="flex flex-wrap items-center gap-3 py-4">
              <span className="flex-1 font-medium">{it.name}</span>
              <input
                type="number"
                min={1}
                value={it.quantity}
                onChange={(e) => updateQuantity(i, Number(e.target.value))}
                className="w-16 rounded-lg border border-ink/15 px-2 py-1.5 text-sm text-ink outline-none focus:border-copper focus:ring-2 focus:ring-copper/20"
              />
              <input
                placeholder="ملاحظة (مثال: بدون بصل)"
                value={it.note}
                onChange={(e) => updateNote(i, e.target.value)}
                className="min-w-[10rem] flex-1 rounded-lg border border-ink/15 px-3 py-1.5 text-sm text-ink outline-none placeholder:text-ink-soft/50 focus:border-copper focus:ring-2 focus:ring-copper/20"
              />
              <button
                onClick={() => removeItem(i)}
                className="text-sm font-medium text-brick hover:underline"
              >
                إزالة
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-6 flex items-center justify-between border-t border-ink/10 pt-4 text-lg">
          <span className="text-sm text-ink-soft">الإجمالي</span>
          <span className="font-display text-2xl">{total.toFixed(2)}</span>
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-ink/10 bg-paper-2 px-5 py-4 sm:px-8">
        <button
          onClick={handleSubmitOrder}
          disabled={loading}
          className="mx-auto flex w-full max-w-2xl items-center justify-center gap-2 rounded-full bg-copper py-3 text-sm font-medium text-paper transition-colors hover:bg-copper-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "جارِ الإرسال…" : "إرسال الطلب للمطبخ"}
        </button>
      </div>
    </div>
  );
}
