import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Search, ShoppingBag, Plus, Minus, Utensils, ChevronLeft, AlertCircle } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getPublicMenuByTableCode } from "../../api/menu";
import { useCart } from "../../context/CartContext";
import { getThemePreset } from "../../config/themes";
import Spinner from "../../components/ui/Spinner";

const fallback = {
  primary_color: "#B8793E",
  secondary_color: "#5B7A52",
  text_color: "#171717",
  button_color: "#171717",
  background_color: "#F7F3E9",
  card_style: "rounded",
  show_menupilot_branding: true,
};

function themeColors(theme) {
  if (!theme) return {};
  if (theme.preset === "custom" && theme.colors) return theme.colors;
  const preset = getThemePreset(theme.preset);
  return preset
    ? {
        primary_color: preset.primary,
        secondary_color: preset.secondary,
        background_color: preset.background,
      }
    : {};
}

export default function Menu() {
  const { tableCode } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const { addItem, items, updateQuantity, removeItem, total: cartTotal } = useCart();
  // Index of a menu item in the cart (plain line without a note) for the inline stepper.
  const cartIndex = (id) => items.findIndex((it) => String(it.menuItemId) === String(id) && !it.note);

  const [menuItems, setMenuItems] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [addedItem, setAddedItem] = useState("");

  useEffect(() => {
    let cancelled = false;

    getPublicMenuByTableCode(tableCode)
      .then((result) => {
        if (!cancelled) {
          setMenuItems(result.items || []);
          setRestaurant(result.restaurant || result.table || null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tableCode]);

  const branding = useMemo(() => {
    const theme = themeColors(restaurant?.theme);
    return { ...fallback, ...theme, ...(restaurant?.branding || {}) };
  }, [restaurant]);

  const categories = useMemo(
    () => ["الكل", ...new Set(menuItems.map((i) => i.category).filter(Boolean))],
    [menuItems]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menuItems.filter(
      (i) =>
        (activeCategory === "الكل" || i.category === activeCategory) &&
        (!q || `${i.name} ${i.description || ""}`.toLowerCase().includes(q))
    );
  }, [menuItems, query, activeCategory]);

  const cartCount = items.reduce((s, i) => s + (i.quantity || 1), 0);
  const cartPath = `/t/${tableCode}/cart${sessionId ? `?session=${encodeURIComponent(sessionId)}` : ""}`;
  const radius = branding.card_style === "square" ? "8px" : branding.card_style === "soft" ? "20px" : "28px";

  if (loading) return <Spinner label="جارِ تجهيز قائمتك…" />;

  if (error) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center px-6 text-center text-ink" style={{ background: branding.background_color }}>
        <div className="w-full max-w-sm rounded-[28px] border border-brick/15 bg-paper p-8 shadow-xl">
          <AlertCircle className="mx-auto text-brick" />
          <h1 className="mt-5 text-2xl font-bold">تعذّر تحميل القائمة</h1>
          <p className="mt-2 text-sm leading-7 text-ink-soft">{error.message || "حدث خطأ غير متوقع."}</p>
          <button onClick={() => window.location.reload()} className="mt-6 w-full rounded-2xl bg-ink px-5 py-3 text-sm font-bold text-paper">
            حاول مرة أخرى
          </button>
        </div>
      </div>
    );
  }

  const restaurantName = restaurant?.name || restaurant?.restaurant_name || "مطعمك المفضل";

  return (
    <div
      dir="rtl"
      className="min-h-screen pb-32"
      style={{
        color: branding.text_color,
        backgroundColor: branding.background_color,
        fontFamily: branding.font_family && branding.font_family !== "system" ? branding.font_family : undefined,
      }}
    >
      <header
        className="relative overflow-hidden text-paper"
        style={{
          backgroundColor: branding.primary_color,
          backgroundImage: branding.background_url
            ? `linear-gradient(#0005,#0005),url(${branding.background_url})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="mx-auto max-w-5xl px-5 pb-8 pt-6 sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => navigate(-1)} aria-label="رجوع" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10">
                <ArrowRight size={19} aria-hidden="true" />
              </button>
              <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/90 text-ink">
                {branding.logo_url ? <img src={branding.logo_url} alt={restaurantName} className="h-full w-full object-cover" /> : <Utensils size={20} aria-hidden="true" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-black">{restaurantName}</p>
                <p className="text-xs text-white/70">طاولة {tableCode}</p>
              </div>
            </div>
            <button onClick={() => navigate(cartPath)} aria-label={cartCount ? `السلة، ${cartCount} عناصر` : "السلة فارغة"} className="relative grid h-11 w-11 place-items-center rounded-2xl border border-white/20 bg-white/10">
              <ShoppingBag size={20} aria-hidden="true" />
              {cartCount > 0 && <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-xs font-black" style={{ background: branding.secondary_color }}>{cartCount}</span>}
            </button>
          </div>

          <div className="mt-8">
            <p className="text-sm font-medium" style={{ color: branding.secondary_color }}>أهلاً بك 👋</p>
            <h1 className="mt-1 text-4xl font-black leading-tight sm:text-5xl">ماذا ترغب اليوم؟</h1>
            <p className="mt-2 text-sm leading-6 text-white/70">تصفح القائمة واختر طلبك.</p>
          </div>

          <label className="mt-6 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-ink shadow-xl">
            <Search size={19} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن طبق…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
        </div>
      </header>

      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 top-4 z-50 mx-auto max-w-sm">
        {addedItem && <div className="flex items-center justify-center gap-2 rounded-2xl bg-herb px-4 py-3 text-sm font-bold text-paper shadow-lg animate-dialog-in"><Check size={17} aria-hidden="true" />أُضيف «{menuItems.find((m) => m.id === addedItem)?.name || "الطبق"}» إلى السلة</div>}
      </div>

      <main className={`mx-auto max-w-5xl px-5 sm:px-8 ${cartCount > 0 ? "pb-32" : "pb-10"}`}>
        <div className="flex gap-2 overflow-x-auto py-5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              aria-pressed={activeCategory === c}
              className="min-h-11 whitespace-nowrap rounded-full px-5 text-sm font-bold transition-colors"
              style={activeCategory === c ? { background: branding.button_color, color: "#fff" } : { background: "#fff", border: "1px solid #0002" }}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mb-5 flex items-end justify-between">
          <div><p className="text-xs opacity-60">اكتشف قائمتنا</p><h2 className="mt-1 text-2xl font-bold">الأطباق المتاحة</h2></div>
          <span className="text-xs opacity-55">{filtered.length} طبق</span>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-black/10 bg-white px-6 py-12 text-center">
            <Search size={28} className="opacity-50" aria-hidden="true" />
            <p className="text-base font-bold">{query ? `لا توجد أطباق تطابق «${query}»` : "لا توجد أطباق في هذا التصنيف حاليًا"}</p>
            <button onClick={() => { setQuery(""); setActiveCategory("الكل"); }} className="min-h-11 rounded-2xl border border-black/15 px-5 text-sm font-bold">عرض كل الأطباق</button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <article key={item.id} className="overflow-hidden border border-black/10 bg-white shadow-sm" style={{ borderRadius: radius }}>
              <div className="relative aspect-[4/3] overflow-hidden bg-black/5">
                {item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Utensils style={{ color: branding.primary_color }} size={42} /></div>}
              </div>
              <div className="p-5">
                <h3 className="text-xl font-bold">{item.name}</h3>
                {item.description && <p className="mt-2 line-clamp-2 text-sm leading-6 opacity-75">{item.description}</p>}
                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="text-lg font-black" style={{ color: branding.primary_color }}>{item.price} ₪</span>
                  {cartIndex(item.id) >= 0 ? (
                    // Already in the cart: adjust here instead of opening the cart.
                    <div className="flex items-center gap-1 rounded-2xl p-1 text-white" style={{ background: branding.button_color }}>
                      <button onClick={() => { const i = cartIndex(item.id); items[i].quantity > 1 ? updateQuantity(i, items[i].quantity - 1) : removeItem(i); }} aria-label={`إنقاص ${item.name}`} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-black/10"><Minus size={17} aria-hidden="true" /></button>
                      <span className="min-w-6 text-center text-base font-black tabular-nums" aria-live="polite" aria-label={`الكمية ${items[cartIndex(item.id)].quantity}`}>{items[cartIndex(item.id)].quantity}</span>
                      <button onClick={() => addItem(item)} aria-label={`زيادة ${item.name}`} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-black/10"><Plus size={17} aria-hidden="true" /></button>
                    </div>
                  ) : (
                    <button onClick={() => { addItem(item); setAddedItem(item.id); setTimeout(() => setAddedItem(""), 1600); }} aria-label={`إضافة ${item.name} إلى السلة`} className="flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-bold text-white transition-transform active:scale-95" style={{ background: branding.button_color }}>
                      <Plus size={17} aria-hidden="true" />إضافة
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      {cartCount > 0 && (
        <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-5xl">
          <button onClick={() => navigate(cartPath)} className="flex w-full items-center justify-between rounded-2xl bg-ink px-5 py-4 text-paper shadow-2xl">
            <span className="flex items-center gap-3"><ShoppingBag size={19} /><span className="text-right"><b className="block text-sm">عرض طلبك</b><span className="text-xs text-paper/70">{cartCount} عناصر، <span className="tabular-nums">{Number(cartTotal || 0).toFixed(2)} ₪</span></span></span></span>
            <span className="flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-black text-white" style={{ background: branding.button_color }}>السلة <ChevronLeft size={17} /></span>
          </button>
        </div>
      )}

      {branding.show_menupilot_branding && <p className="mt-8 text-center text-xs opacity-40">Powered by menuPilot</p>}
    </div>
  );
}
