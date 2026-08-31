/* ==========================================================================
   Menu.jsx — القائمة العامة بعد فتح الجلسة
   يغطي: FR-11 (عرض قائمة المطعم/الفرع/الطاولة الصحيحة)، ويغذّي FR-12..14
   (الإضافة للسلة) عبر CartContext.
   ========================================================================== */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPublicMenuByTableCode } from "../../api/menu";
import { useCart } from "../../context/CartContext";
import Spinner from "../../components/ui/Spinner";

export default function Menu() {
  const { tableCode } = useParams();
  const navigate = useNavigate();
  const { addItem, items } = useCart();

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getPublicMenuByTableCode(tableCode)
      .then(setMenuItems)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [tableCode]);

  if (loading) return <Spinner label="جارِ تحميل القائمة…" />;
  if (error)
    return (
      <p role="alert" className="p-6 text-sm text-brick">
        تعذّر تحميل القائمة: {error.message}
      </p>
    );

  return (
    <div className="min-h-screen bg-paper-2 pb-28 text-ink">
      <header className="bg-ink px-5 py-6 text-paper sm:px-8">
        <span className="text-xs font-medium tracking-wide text-copper">
          طاولة {tableCode}
        </span>
        <h1 className="font-display text-3xl">القائمة</h1>
      </header>

      <ul className="mx-auto max-w-2xl divide-y divide-ink/10 px-5 sm:px-8">
        {menuItems.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-4 py-5">
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-16 w-16 shrink-0 rounded-lg border border-ink/10 object-cover order-first"
              />
            )}
            <div className="flex-1">
              <strong className="font-display text-lg font-normal text-ink">
                {item.name}
              </strong>
              <p className="mt-1 text-sm text-ink-soft">{item.description}</p>
              <span className="mt-1.5 block text-sm font-medium text-copper-deep">
                {item.price}
              </span>
            </div>
            {/* FR-13/FR-14 (quantity + note) belong in a dedicated item-detail
                modal; addItem() here defaults to qty=1, no note, as a starting point. */}
            <button
              onClick={() => addItem(item)}
              className="shrink-0 rounded-full bg-copper px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-copper-deep"
            >
              إضافة
            </button>
          </li>
        ))}
      </ul>

      <div className="fixed inset-x-0 bottom-0 border-t border-ink/10 bg-paper-2 px-5 py-4 sm:px-8">
        <button
          onClick={() => navigate(`/t/${tableCode}/cart`)}
          className="mx-auto flex w-full max-w-2xl items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
        >
          عرض السلة ({items.length})
        </button>
      </div>
    </div>
  );
}
