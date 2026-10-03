/* ==========================================================================
   Menu.jsx — the customer's QR menu (route /t/:tableCode/menu).
   --------------------------------------------------------------------------
   Mobile-first, like a delivery app:
     restaurant header → sticky search + category chips (tap = jump to the
     category, the one in view lights up) → dishes grouped by category →
     product sheet (big image, quantity, note for the kitchen) →
     floating cart bar with count and total.
   The restaurant's branding (colours, logo, cover, card style, font) and
   menu style (layout, header, logo shape, chips… components/menu/menuStyle)
   are applied on top. Product images come from item.imageUrl (the API field);
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
import MenuItemCard from "../../components/menu/MenuItemCard";
import { tableSession } from "../../utils/tableSession";
import { AR, countAr } from "../../utils/plural";
import { DEFAULT_TAGLINE, cardRadius, logoRadius, resolveMenuStyle } from "../../components/menu/menuStyle";
import { t, dir } from "../../i18n";
import LanguageSwitch from "../../components/ui/LanguageSwitch";

const ALL = t("الكل");
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
      <button type="button" onClick={onMinus} aria-label={t("إنقاص {0}", { 0: label })} className={`grid ${box} place-items-center rounded-full bg-white shadow-sm`}><Minus size={16} aria-hidden="true" /></button>
      <span className="min-w-8 text-center text-base font-black tabular-nums" aria-live="polite">{value}</span>
      <button type="button" onClick={onPlus} aria-label={t("زيادة {0}", { 0: label })} className={`grid ${box} place-items-center rounded-full text-white shadow-sm`} style={{ background: color }}><Plus size={16} aria-hidden="true" /></button>
    </div>
  );
}

export default function Menu() {
  const { tableCode } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  // The menu needs no session: it's opened when the first order is sent.
  const sessionId = searchParams.get("session") || tableSession(tableCode);
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

  const style = useMemo(() => resolveMenuStyle(restaurant?.branding), [restaurant]);
  const brand = useMemo(() => {
    const b = { ...FALLBACK, ...themeColors(restaurant?.theme), ...(restaurant?.branding || {}) };
    return style.background_color ? { ...b, background_color: style.background_color } : b;
  }, [restaurant, style]);
  const radius = cardRadius(brand.card_style);

  const categories = useMemo(() => [ALL, ...new Set(menuItems.map((i) => i.category).filter(Boolean))], [menuItems]);
  // Search filters; categories are a table of contents (tap = jump, scroll = highlight).
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menuItems.filter((i) => !q || `${i.name} ${i.description || ""}`.toLowerCase().includes(q));
  }, [menuItems, query]);
  // "الكل" shows the menu grouped by category, in the owner's order.
  const sections = useMemo(() => {
    const groups = new Map();
    visible.forEach((item) => {
      const key = item.category || t("أصناف أخرى");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return [...groups.entries()];
  }, [visible]);

  const cartCount = cart.reduce((sum, i) => sum + (i.quantity || 1), 0);
  const inCart = (id) => cart.filter((i) => String(i.menuItemId) === String(id)).reduce((sum, i) => sum + i.quantity, 0);
  const withSession = (path) => `${path}${sessionId ? `?session=${encodeURIComponent(sessionId)}` : ""}`;
  const restaurantName = restaurant?.name || t("مطعمك المفضل");
  const tableLabel = table?.label ? t("طاولة {0}", { 0: table.label }) : t("طاولتك");
  const sectionId = (category) => `cat-${categories.indexOf(category)}`;
  const chipsBar = useRef(null);

  function chooseCategory(category) {
    const target = category === ALL ? listTop.current : document.getElementById(sectionId(category));
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    setActiveCategory(category);
  }

  // The category in view lights up, and its chip scrolls into the bar.
  useEffect(() => {
    let frame = 0;
    const spy = () => {
      frame = 0;
      const line = (chipsBar.current?.getBoundingClientRect().bottom || 0) + 12;
      let current = ALL;
      sections.forEach(([category]) => {
        const el = document.getElementById(sectionId(category));
        if (el && el.getBoundingClientRect().top <= line) current = category;
      });
      setActiveCategory(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(spy); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); };
  }, [sections]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    chipsBar.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeCategory]);

  function quickAdd(item) {
    addItem(item, 1, "");
    toast.success(t("أُضيف «{0}» إلى السلة", { 0: item.name }));
  }

  function addFromSheet() {
    addItem(sheet.item, sheet.quantity, sheet.note.trim());
    toast.success(t("أُضيف {0} × «{1}» إلى السلة", { 0: sheet.quantity, 1: sheet.item.name }));
    setSheet(null);
  }

  if (loading) {
    return (
      <div dir={dir} className="min-h-screen" style={{ background: brand.background_color }} role="status" aria-live="polite">
        <span className="sr-only">{t("جارِ تجهيز قائمتك…")}</span>
        <div className="h-44 animate-pulse bg-black/10" />
        <div className="mx-auto max-w-3xl space-y-3 px-4 py-5">
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-black/[0.06]" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir={dir} className="grid min-h-screen place-items-center px-6 text-center text-ink" style={{ background: brand.background_color }}>
        <div className="w-full max-w-sm rounded-3xl border border-brick/15 bg-white p-8 shadow-xl">
          <AlertCircle className="mx-auto text-brick" aria-hidden="true" />
          <h1 className="mt-5 text-2xl font-bold">{t("تعذّر تحميل القائمة")}</h1>
          <p className="mt-2 text-sm leading-7 text-ink-soft">{error.message || t("حدث خطأ غير متوقع.")}</p>
          <button onClick={() => window.location.reload()} className="mt-6 h-12 w-full rounded-2xl bg-navy text-sm font-bold text-paper">{t("حاول مرة أخرى")}</button>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className={`min-h-screen ${cartCount ? "pb-28" : "pb-10"}`}
      style={{ color: brand.text_color, backgroundColor: brand.background_color, fontFamily: brand.font_family && brand.font_family !== "system" ? brand.font_family : undefined }}>

      {/* ── Restaurant header: cover, solid band, or minimal ───────────── */}
      {(() => {
        const minimal = style.header === "minimal";
        const cover = style.header === "cover";
        const roundBtn = `grid h-11 w-11 place-items-center rounded-full ${minimal ? "bg-black/[0.05]" : "bg-black/25 backdrop-blur"}`;
        return (
          <header className={`relative ${minimal ? "" : "text-white"}`} style={minimal ? undefined : { backgroundColor: brand.primary_color }}>
            {cover && brand.background_url && <img src={brand.background_url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />}
            {cover && <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" aria-hidden="true" />}
            <div className={`relative mx-auto max-w-3xl px-4 pt-4 ${cover ? "pb-6" : "pb-4"}`}>
              <div className="flex items-center justify-between">
                <button onClick={() => navigate(-1)} aria-label={t("رجوع")} className={roundBtn}><ArrowRight size={20} aria-hidden="true" /></button>
                <LanguageSwitch tone={minimal ? "light" : "dark"} className={minimal ? "" : "bg-black/25 backdrop-blur"} />
                <button onClick={() => navigate(withSession(`/t/${tableCode}/cart`))} aria-label={cartCount ? t("السلة، {0}", { 0: countAr(cartCount, AR.items) }) : t("السلة فارغة")} className={`relative ${roundBtn}`}>
                  <ShoppingBag size={20} aria-hidden="true" />
                  {cartCount > 0 && <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-xs font-black" style={minimal ? { background: brand.primary_color, color: "#fff" } : { background: "#fff", color: brand.primary_color }}>{cartCount}</span>}
                </button>
              </div>
              <div className={`flex items-end gap-4 ${cover ? "mt-8" : "mt-3"}`}>
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden bg-white shadow-lg" style={{ borderRadius: logoRadius(style.logo_shape) }}>
                  {brand.logo_url ? <img src={brand.logo_url} alt={restaurantName} className="h-full w-full object-cover" /> : <Utensils size={26} style={{ color: brand.primary_color }} aria-hidden="true" />}
                </div>
                <div className="min-w-0 pb-0.5">
                  <h1 className={`truncate text-2xl font-black leading-tight ${minimal ? "" : "drop-shadow-sm"}`}>{restaurantName}</h1>
                  <p className={`mt-1 text-sm font-bold ${minimal ? "opacity-70" : "text-white/85"}`}>{tableLabel} · {style.tagline || DEFAULT_TAGLINE}</p>
                </div>
              </div>
            </div>
          </header>
        );
      })()}

      {/* ── Sticky search + categories ────────────────────────────────── */}
      <div ref={chipsBar} className="sticky top-0 z-30 border-b border-black/5 backdrop-blur" style={{ backgroundColor: `${brand.background_color}f0` }}>
        <div className="mx-auto max-w-3xl px-4 pt-3">
          <label className="flex h-12 items-center gap-3 rounded-2xl px-4 text-ink shadow-sm ring-1 ring-black/5" style={{ background: style.surface_color }}>
            <Search size={18} className="shrink-0 opacity-60" aria-hidden="true" />
            <span className="sr-only">{t("ابحث في المنيو")}</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ابحث عن طبق أو مشروب…")} className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
            {query && <button onClick={() => setQuery("")} aria-label={t("مسح البحث")} className="-m-2 grid h-9 w-9 place-items-center rounded-full"><X size={16} aria-hidden="true" /></button>}
          </label>
          <nav aria-label={t("تصنيفات المنيو")} className={`-mx-4 flex overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${style.chips === "underline" ? "gap-5 pt-2" : "gap-2 py-3"}`}>
            {categories.map((category) => {
              const active = activeCategory === category;
              const look = style.chips === "underline"
                ? { className: "h-11 shrink-0 whitespace-nowrap border-b-[3px] text-sm font-bold transition-colors", style: { borderColor: active ? brand.primary_color : "transparent", color: active ? brand.primary_color : brand.text_color, opacity: active ? 1 : 0.75 } }
                : { className: "h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors", style: active ? { background: brand.primary_color, color: "#fff" } : { background: style.surface_color, color: brand.text_color, boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.08)" } };
              return (
                <button key={category} onClick={() => chooseCategory(category)} aria-current={active ? "true" : undefined} className={look.className} style={look.style}>
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
            <span className="font-bold">{t("تضيف طلبًا جديدًا لنفس الطاولة. طلباتك السابقة مستمرة.")}</span>
            <button onClick={() => navigate(`/order-tracking?session=${encodeURIComponent(sessionId)}`)} className="min-h-10 font-bold underline-offset-4 hover:underline" style={{ color: brand.primary_color }}>{t("العودة لتتبع طلباتك")}</button>
          </div>
        )}

        {menuItems.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-white px-6 py-12 text-center shadow-sm">
            <Utensils className="mx-auto opacity-40" size={30} aria-hidden="true" />
            <p className="mt-3 text-base font-bold">{t("لا توجد أصناف متاحة الآن")}</p>
            <p className="mt-1 text-sm opacity-70">{t("اطلب المساعدة من أحد أفراد الطاقم.")}</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-white px-6 py-12 text-center shadow-sm">
            <Search className="mx-auto opacity-40" size={28} aria-hidden="true" />
            <p className="mt-3 text-base font-bold">{t("لا توجد نتائج لـ «")}{query}»</p>
            <button onClick={() => setQuery("")} className="mt-4 h-11 rounded-2xl px-5 text-sm font-bold ring-1 ring-black/10">{t("عرض كل المنيو")}</button>
          </div>
        ) : (
          sections.map(([category, list]) => {
            const listClass = {
              compact: "grid gap-2.5 md:grid-cols-2",
              photo: "grid gap-4 sm:grid-cols-2",
              grid: "grid grid-cols-2 gap-3 md:grid-cols-3",
              text: "divide-y divide-black/[0.06] overflow-hidden shadow-sm ring-1 ring-black/5",
            }[style.layout] || "grid gap-2.5 md:grid-cols-2";
            return (
              <section key={category} id={sectionId(category)} className="mt-6" style={{ scrollMarginTop: "8.5rem" }} aria-labelledby={`${sectionId(category)}-title`}>
                <h2 id={`${sectionId(category)}-title`} className="mb-3 flex items-baseline gap-2 text-lg font-black">
                  {category} <span className="text-xs font-bold opacity-50">{list.length}</span>
                </h2>
                <ul className={listClass} style={style.layout === "text" ? { background: style.surface_color, borderRadius: radius } : undefined}>
                  {list.map((item) => (
                    <li key={item.id}>
                      <MenuItemCard item={item} style={style} brand={brand} radius={radius} count={inCart(item.id)}
                        onOpen={(it) => setSheet({ item: it, quantity: 1, note: "" })} onAdd={quickAdd} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}

        {brand.show_menupilot_branding && (
          <a href="/" className="mx-auto mt-10 flex w-fit items-center gap-2 text-xs font-bold opacity-60 transition-opacity hover:opacity-100" dir="ltr">
            {t("مدعوم من")} <BrandLogo height={20} />
          </a>
        )}
      </main>

      {/* ── Product sheet ─────────────────────────────────────────────── */}
      <Modal open={Boolean(sheet)} onClose={() => setSheet(null)} title={sheet?.item.name} size="md"
        footer={sheet && (
          <button onClick={addFromSheet} className="flex h-14 w-full items-center justify-between rounded-2xl px-5 text-base font-black text-white" style={{ background: brand.button_color }}>
            <span>{t("أضف إلى السلة")}</span>
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
              <span className="text-sm font-bold">{t("الكمية")}</span>
              <Stepper size="lg" value={sheet.quantity} label={sheet.item.name} color={brand.button_color}
                onMinus={() => setSheet((s) => ({ ...s, quantity: Math.max(1, s.quantity - 1) }))}
                onPlus={() => setSheet((s) => ({ ...s, quantity: Math.min(99, s.quantity + 1) }))} />
            </div>
            <label className="block">
              <span className="text-sm font-bold">{t("ملاحظة للمطبخ")} <span className="font-normal text-muted">{t("(اختياري)")}</span></span>
              <textarea rows={2} maxLength={500} value={sheet.note} onChange={(e) => setSheet((s) => ({ ...s, note: e.target.value }))}
                placeholder={t("مثل: بدون بصل، الصوص جانبًا")} className="mt-2 w-full resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-copper" />
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
            <span className="text-base font-black">{t("عرض السلة")}</span>
            <span className="text-base font-black tabular-nums">{money(cartTotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
