/* ==========================================================================
   Menu.jsx — the customer's QR menu (route /t/:tableCode/menu).
   --------------------------------------------------------------------------
   Mobile-first, like a delivery app:
     compact restaurant header → sticky search + category chips →
     products grouped by category (image, name, description, price) →
     product sheet (big image, quantity, note for the kitchen) →
     floating cart bar with count and total.
   The restaurant's branding (colours, logo, cover, card style, font) is
   applied on top. Product images come from item.imageUrl (the API field);
   a broken or missing image falls back to a tinted placeholder.
   ========================================================================== */
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Minus, Plus, Search, ShoppingBag, Utensils, X } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import BrandLogo from "../../components/brand/Logo";
import { getPublicMenuByTableCode } from "../../api/menu";
import { useCart } from "../../context/CartContext";
import { getThemePreset } from "../../config/themes";
import Modal from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Toast";
import { money } from "../../utils/format";

const ALL = "الكل";
const FALLBACK = {
  primary_color: "#B8793E",
  secondary_color: "#4B6A8A",
  text_color: "#172331",
  button_color: "#1F2D3D",
  background_color: "#F7F3E9",
  card_style: "rounded",
  show_menupilot_branding: true,
};

function themeColors(theme) {
  if (!theme) return {};
  if (theme.preset === "custom" && theme.colors) return theme.colors;
  const preset = getThemePreset(theme.preset);
  return preset ? { primary_color: preset.primary, secondary_color: preset.secondary, background_color: preset.background } : {};
}

/** Product image with a graceful placeholder (missing file, old upload, bad URL). */
function MenuImage({ src, alt, tint, className = "", iconSize = 26 }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`grid place-items-center ${className}`} style={{ background: `${tint}1f` }} aria-hidden="true">
        <Utensils size={iconSize} style={{ color: tint }} />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

function Stepper({ value, onMinus, onPlus, color, label, size = "md" }) {
  const box = size === "lg" ? "h-12 w-12" : "h-9 w-9";
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-black/[0.05] p-1">
      <button type="button" onClick={onMinus} aria-label={`إنقاص ${label}`} className={`grid ${box} place-items-center rounded-full bg-white shadow-sm`}><Minus size={16} aria-hidden="true" /></button>
      <span className="min-w-8 text-center text-base font-black tabular-nums" aria-live="polite">{value}</span>
      <button type="button" onClick={onPlus} aria-label={`زيادة ${label}`} className={`grid ${box} place-items-center rounded-full text-white shadow-sm`} style={{ background: color }}><Plus size={16} aria-hidden="true" /></button>
    </div>
  );
}

export default function Menu() {
  const { tableCode } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const addingMore = searchParams.get("more") === "1"; // came from tracking to order more
  const { addItem, items: cart, total: cartTotal } = useCart();

  const [menuItems, setMenuItems] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(ALL);
  const [sheet, setSheet] = useState(null); // { item, quantity, note }
  const listTop = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getPublicMenuByTableCode(tableCode)
      .then((result) => {
        if (cancelled) return;
        setMenuItems(result.items || []);
        setRestaurant(result.restaurant || null);
        setTable(result.table || null);
      })
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [tableCode]);

  const brand = useMemo(() => ({ ...FALLBACK, ...themeColors(restaurant?.theme), ...(restaurant?.branding || {}) }), [restaurant]);
  const radius = brand.card_style === "square" ? "10px" : brand.card_style === "soft" ? "18px" : "22px";

  const categories = useMemo(() => [ALL, ...new Set(menuItems.map((i) => i.category).filter(Boolean))], [menuItems]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menuItems.filter((i) => (activeCategory === ALL || i.category === activeCategory) && (!q || `${i.name} ${i.description || ""}`.toLowerCase().includes(q)));
  }, [menuItems, query, activeCategory]);
  // "الكل" shows the menu grouped by category, in the owner's order.
  const sections = useMemo(() => {
    const groups = new Map();
    visible.forEach((item) => {
      const key = item.category || "أصناف أخرى";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return [...groups.entries()];
  }, [visible]);

  const cartCount = cart.reduce((sum, i) => sum + (i.quantity || 1), 0);
  const inCart = (id) => cart.filter((i) => String(i.menuItemId) === String(id)).reduce((sum, i) => sum + i.quantity, 0);
  const withSession = (path) => `${path}${sessionId ? `?session=${encodeURIComponent(sessionId)}` : ""}`;
  const restaurantName = restaurant?.name || "مطعمك المفضل";
  const tableLabel = table?.label ? `طاولة ${table.label}` : "طاولتك";

  function chooseCategory(category) {
    setActiveCategory(category);
    listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function quickAdd(item) {
    addItem(item, 1, "");
    toast.success(`أُضيف «${item.name}» إلى السلة`);
  }

  function addFromSheet() {
    addItem(sheet.item, sheet.quantity, sheet.note.trim());
    toast.success(`أُضيف ${sheet.quantity} × «${sheet.item.name}» إلى السلة`);
    setSheet(null);
  }

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen" style={{ background: brand.background_color }} role="status" aria-live="polite">
        <span className="sr-only">جارِ تجهيز قائمتك…</span>
        <div className="h-44 animate-pulse bg-black/10" />
        <div className="mx-auto max-w-3xl space-y-3 px-4 py-5">
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-black/[0.06]" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center px-6 text-center text-ink" style={{ background: brand.background_color }}>
        <div className="w-full max-w-sm rounded-3xl border border-brick/15 bg-white p-8 shadow-xl">
          <AlertCircle className="mx-auto text-brick" aria-hidden="true" />
          <h1 className="mt-5 text-2xl font-bold">تعذّر تحميل القائمة</h1>
          <p className="mt-2 text-sm leading-7 text-ink-soft">{error.message || "حدث خطأ غير متوقع."}</p>
          <button onClick={() => window.location.reload()} className="mt-6 h-12 w-full rounded-2xl bg-navy text-sm font-bold text-paper">حاول مرة أخرى</button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className={`min-h-screen ${cartCount ? "pb-28" : "pb-10"}`}
      style={{ color: brand.text_color, backgroundColor: brand.background_color, fontFamily: brand.font_family && brand.font_family !== "system" ? brand.font_family : undefined }}>

      {/* ── Restaurant header ─────────────────────────────────────────── */}
      <header className="relative text-white" style={{ backgroundColor: brand.primary_color }}>
        {brand.background_url && <img src={brand.background_url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" aria-hidden="true" />
        <div className="relative mx-auto max-w-3xl px-4 pb-6 pt-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} aria-label="رجوع" className="grid h-11 w-11 place-items-center rounded-full bg-black/25 backdrop-blur"><ArrowRight size={20} aria-hidden="true" /></button>
            <button onClick={() => navigate(withSession(`/t/${tableCode}/cart`))} aria-label={cartCount ? `السلة، ${cartCount} عناصر` : "السلة فارغة"} className="relative grid h-11 w-11 place-items-center rounded-full bg-black/25 backdrop-blur">
              <ShoppingBag size={20} aria-hidden="true" />
              {cartCount > 0 && <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-xs font-black" style={{ color: brand.primary_color }}>{cartCount}</span>}
            </button>
          </div>
          <div className="mt-8 flex items-end gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-lg">
              {brand.logo_url ? <img src={brand.logo_url} alt={restaurantName} className="h-full w-full object-cover" /> : <Utensils size={26} style={{ color: brand.primary_color }} aria-hidden="true" />}
            </div>
            <div className="min-w-0 pb-0.5">
              <h1 className="truncate text-2xl font-black leading-tight drop-shadow-sm">{restaurantName}</h1>
              <p className="mt-1 text-sm font-bold text-white/85">{tableLabel} · اطلب من هاتفك مباشرة</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Sticky search + categories ────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-black/5 backdrop-blur" style={{ backgroundColor: `${brand.background_color}f0` }}>
        <div className="mx-auto max-w-3xl px-4 pt-3">
          <label className="flex h-12 items-center gap-3 rounded-2xl bg-white px-4 text-ink shadow-sm ring-1 ring-black/5">
            <Search size={18} className="shrink-0 opacity-60" aria-hidden="true" />
            <span className="sr-only">ابحث في المنيو</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن طبق أو مشروب…" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
            {query && <button onClick={() => setQuery("")} aria-label="مسح البحث" className="-m-2 grid h-9 w-9 place-items-center rounded-full"><X size={16} aria-hidden="true" /></button>}
          </label>
          <nav aria-label="تصنيفات المنيو" className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((category) => {
              const active = activeCategory === category;
              return (
                <button key={category} onClick={() => chooseCategory(category)} aria-pressed={active}
                  className="h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors"
                  style={active ? { background: brand.primary_color, color: "#fff" } : { background: "#fff", color: brand.text_color, boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.08)" }}>
                  {category}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4" ref={listTop} style={{ scrollMarginTop: "8rem" }}>
        {addingMore && sessionId && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-black/5">
            <span className="font-bold">تضيف طلبًا جديدًا لنفس الطاولة. طلباتك السابقة مستمرة.</span>
            <button onClick={() => navigate(`/order-tracking?session=${encodeURIComponent(sessionId)}`)} className="min-h-10 font-bold underline-offset-4 hover:underline" style={{ color: brand.primary_color }}>العودة لتتبع طلباتك</button>
          </div>
        )}

        {menuItems.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-white px-6 py-12 text-center shadow-sm">
            <Utensils className="mx-auto opacity-40" size={30} aria-hidden="true" />
            <p className="mt-3 text-base font-bold">لا توجد أصناف متاحة الآن</p>
            <p className="mt-1 text-sm opacity-70">اطلب المساعدة من أحد أفراد الطاقم.</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-white px-6 py-12 text-center shadow-sm">
            <Search className="mx-auto opacity-40" size={28} aria-hidden="true" />
            <p className="mt-3 text-base font-bold">{query ? `لا توجد نتائج لـ «${query}»` : "لا توجد أصناف في هذا التصنيف"}</p>
            <button onClick={() => { setQuery(""); setActiveCategory(ALL); }} className="mt-4 h-11 rounded-2xl px-5 text-sm font-bold ring-1 ring-black/10">عرض كل المنيو</button>
          </div>
        ) : (
          sections.map(([category, list]) => (
            <section key={category} className="mt-6" aria-labelledby={`cat-${category}`}>
              <h2 id={`cat-${category}`} className="mb-3 flex items-baseline gap-2 text-lg font-black">
                {category} <span className="text-xs font-bold opacity-50">{list.length}</span>
              </h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {list.map((item) => {
                  const count = inCart(item.id);
                  return (
                    <li key={item.id}>
                      <div className="group relative flex h-full gap-3 bg-white p-3 shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md" style={{ borderRadius: radius }}>
                        <button type="button" onClick={() => setSheet({ item, quantity: 1, note: "" })} className="absolute inset-0 z-0" style={{ borderRadius: radius }} aria-label={`تفاصيل ${item.name}`} />
                        <div className="pointer-events-none relative shrink-0">
                          <MenuImage src={item.imageUrl} alt={item.name} tint={brand.primary_color} className="h-28 w-28" />
                          {count > 0 && <span className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-xs font-black text-white">×{count}</span>}
                        </div>
                        <div className="relative z-0 flex min-w-0 flex-1 flex-col pointer-events-none">
                          <h3 className="line-clamp-2 text-[15px] font-black leading-6">{item.name}</h3>
                          {item.description && <p className="mt-1 line-clamp-2 text-[13px] leading-5 opacity-70">{item.description}</p>}
                          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                            <span className="text-base font-black tabular-nums" style={{ color: brand.primary_color }}>{money(item.price)}</span>
                          </div>
                        </div>
                        <button type="button" onClick={() => quickAdd(item)} aria-label={`إضافة ${item.name} إلى السلة`}
                          className="absolute bottom-3 left-3 z-10 grid h-10 w-10 place-items-center rounded-full text-white shadow-md transition-transform active:scale-90"
                          style={{ background: brand.button_color }}>
                          <Plus size={20} aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}

        {brand.show_menupilot_branding && (
          <a href="/" className="mx-auto mt-10 flex w-fit items-center gap-2 text-xs font-bold opacity-60 transition-opacity hover:opacity-100" dir="ltr">
            مدعوم من <BrandLogo height={20} />
          </a>
        )}
      </main>

      {/* ── Product sheet ─────────────────────────────────────────────── */}
      <Modal open={Boolean(sheet)} onClose={() => setSheet(null)} title={sheet?.item.name} size="md"
        footer={sheet && (
          <button onClick={addFromSheet} className="flex h-14 w-full items-center justify-between rounded-2xl px-5 text-base font-black text-white" style={{ background: brand.button_color }}>
            <span>أضف إلى السلة</span>
            <span className="tabular-nums">{money(Number(sheet.item.price) * sheet.quantity)}</span>
          </button>
        )}>
        {sheet && (
          <div className="space-y-5 text-ink">
            <MenuImage src={sheet.item.imageUrl} alt={sheet.item.name} tint={brand.primary_color} iconSize={40} className="aspect-[4/3] w-full rounded-2xl" />
            <div>
              {sheet.item.description && <p className="text-sm leading-7 text-ink-soft">{sheet.item.description}</p>}
              <p className="mt-2 text-xl font-black tabular-nums" style={{ color: brand.primary_color }}>{money(sheet.item.price)}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">الكمية</span>
              <Stepper size="lg" value={sheet.quantity} label={sheet.item.name} color={brand.button_color}
                onMinus={() => setSheet((s) => ({ ...s, quantity: Math.max(1, s.quantity - 1) }))}
                onPlus={() => setSheet((s) => ({ ...s, quantity: Math.min(99, s.quantity + 1) }))} />
            </div>
            <label className="block">
              <span className="text-sm font-bold">ملاحظة للمطبخ <span className="font-normal text-muted">(اختياري)</span></span>
              <textarea rows={2} maxLength={500} value={sheet.note} onChange={(e) => setSheet((s) => ({ ...s, note: e.target.value }))}
                placeholder="مثل: بدون بصل، الصوص جانبًا" className="mt-2 w-full resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-copper" />
            </label>
          </div>
        )}
      </Modal>

      {/* ── Floating cart ─────────────────────────────────────────────── */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2">
          <button onClick={() => navigate(withSession(`/t/${tableCode}/cart`))}
            className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between rounded-2xl px-5 text-white shadow-xl transition-transform active:scale-[0.99]"
            style={{ background: brand.button_color }}>
            <span className="grid h-8 min-w-8 place-items-center rounded-full bg-white/20 px-2 text-sm font-black tabular-nums">{cartCount}</span>
            <span className="text-base font-black">عرض السلة</span>
            <span className="text-base font-black tabular-nums">{money(cartTotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
