import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, ChefHat, Clock3,
  Heart, Menu as MenuIcon, Minus, Plus, Search, ShoppingBag, Sparkles,
  Star, Utensils, UtensilsCrossed, X
} from "lucide-react";
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
  primary_color: "#1f1d1b",
  secondary_color: "#e59819",
  text_color: "#2b2825",
  button_color: "#1f1d1b",
  background_color: "#f7f4ed",
  card_style: "rounded",
  show_menupilot_branding: true,
};

function themeColors(theme) {
  if (!theme) return {};
  if (theme.preset === "custom" && theme.colors) return theme.colors;
  const preset = getThemePreset(theme.preset);
  return preset
    ? { primary_color: preset.primary, secondary_color: preset.secondary, background_color: preset.background }
    : {};
}

function MenuImage({ src, alt, tint, className = "", iconSize = 28 }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`grid place-items-center ${className}`} style={{ background: `${tint}18` }} aria-hidden="true">
        <Utensils size={iconSize} style={{ color: tint }} />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

function Stepper({ value, onMinus, onPlus, color, label, large = false }) {
  const box = large ? "h-11 w-11" : "h-8 w-8";
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-black/[0.05] p-1">
      <button type="button" onClick={onMinus} aria-label={`إنقاص ${label}`} className={`grid ${box} place-items-center rounded-lg bg-white shadow-sm`}><Minus size={15} /></button>
      <span className="min-w-8 text-center text-sm font-black tabular-nums" aria-live="polite">{value}</span>
      <button type="button" onClick={onPlus} aria-label={`زيادة ${label}`} className={`grid ${box} place-items-center rounded-lg text-white shadow-sm`} style={{ background: color }}><Plus size={15} /></button>
    </div>
  );
}

export default function Menu() {
  const { tableCode } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const addingMore = searchParams.get("more") === "1";
  const { addItem, items: cart, total: cartTotal } = useCart();

  const [menuItems, setMenuItems] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(ALL);
  const [sheet, setSheet] = useState(null);
  const [favorites, setFavorites] = useState(() => new Set());
  const [mobileOpen, setMobileOpen] = useState(false);
  const listTop = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
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

  const brand = useMemo(
    () => ({ ...FALLBACK, ...themeColors(restaurant?.theme), ...(restaurant?.branding || {}) }),
    [restaurant]
  );
  const radius = brand.card_style === "square" ? "12px" : brand.card_style === "soft" ? "20px" : "24px";

  const categories = useMemo(
    () => [ALL, ...new Set(menuItems.map((i) => i.category).filter(Boolean))],
    [menuItems]
  );
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menuItems.filter((i) =>
      (activeCategory === ALL || i.category === activeCategory) &&
      (!q || `${i.name} ${i.description || ""}`.toLowerCase().includes(q))
    );
  }, [menuItems, query, activeCategory]);

  const sections = useMemo(() => {
    const groups = new Map();
    visible.forEach((item) => {
      const key = item.category || "أصناف أخرى";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return [...groups.entries()];
  }, [visible]);

  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const inCart = (id) => cart.filter((item) => String(item.menuItemId) === String(id)).reduce((sum, item) => sum + item.quantity, 0);
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

  function toggleFavorite(id) {
    setFavorites((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen" style={{ background: brand.background_color }} role="status">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <div className="h-10 w-28 animate-pulse rounded-xl bg-black/10" />
          <div className="mt-4 h-64 animate-pulse rounded-[30px] bg-black/10" />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-black/[0.06]" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center px-6 text-center" style={{ background: brand.background_color, color: brand.text_color }}>
        <div className="w-full max-w-sm rounded-[28px] border border-black/5 bg-white p-8 shadow-xl">
          <AlertCircle className="mx-auto text-red-500" />
          <h1 className="mt-5 text-2xl font-black">تعذّر تحميل القائمة</h1>
          <p className="mt-2 text-sm leading-7 opacity-70">{error.message || "حدث خطأ غير متوقع."}</p>
          <button onClick={() => window.location.reload()} className="mt-6 h-12 w-full rounded-2xl bg-[#1f1d1b] text-sm font-black text-white">حاول مرة أخرى</button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className={`min-h-screen ${cartCount ? "pb-28" : "pb-10"}`} style={{ color: brand.text_color, backgroundColor: brand.background_color, fontFamily: brand.font_family && brand.font_family !== "system" ? brand.font_family : undefined }}>
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[70px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <button onClick={() => navigate(-1)} aria-label="رجوع" className="grid h-11 w-11 place-items-center rounded-xl bg-[#f5f1ea]">
            <ArrowRight size={19} />
          </button>
          <button onClick={() => listTop.current?.scrollIntoView({ behavior: "smooth" })} className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl text-white shadow-sm" style={{ background: brand.primary_color }}>
              {brand.logo_url ? <img src={brand.logo_url} alt="" className="h-full w-full rounded-xl object-cover" /> : <UtensilsCrossed size={19} />}
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-black">{restaurantName}</p>
              <p className="text-[11px] opacity-55">{tableLabel}</p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileOpen((v) => !v)} aria-label="القائمة" className="grid h-11 w-11 place-items-center rounded-xl bg-[#f5f1ea] md:hidden">
              {mobileOpen ? <X size={19} /> : <MenuIcon size={19} />}
            </button>
            <button onClick={() => navigate(withSession(`/t/${tableCode}/cart`))} aria-label="السلة" className="relative grid h-11 w-11 place-items-center rounded-xl text-white" style={{ background: brand.button_color }}>
              <ShoppingBag size={19} />
              {cartCount > 0 && <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-black" style={{ color: brand.button_color }}>{cartCount}</span>}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="border-t border-black/5 bg-white px-4 py-3 md:hidden">
            <button onClick={() => { setMobileOpen(false); listTop.current?.scrollIntoView({ behavior: "smooth" }); }} className="w-full rounded-xl px-4 py-3 text-right text-sm font-bold hover:bg-black/5">المنيو</button>
            <button onClick={() => { setMobileOpen(false); navigate(withSession(`/t/${tableCode}/cart`)); }} className="w-full rounded-xl px-4 py-3 text-right text-sm font-bold hover:bg-black/5">السلة ({cartCount})</button>
          </div>
        )}
      </header>

      <section className="border-b border-black/5">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-8">
          <div className="relative overflow-hidden rounded-[30px] bg-[#1f1d1b]">
            {brand.background_url && <img src={brand.background_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />}
            <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/40 to-black/65" />
            <div className="relative grid min-h-[310px] items-center gap-8 px-6 py-9 sm:px-10 lg:grid-cols-2 lg:px-14">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[11px] font-black text-white/85">
                  <Sparkles size={14} style={{ color: brand.secondary_color }} />
                  تجربة طلب رقمية
                </div>
                <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">
                  اطلبها بطريقتك،
                  <br />
                  <span style={{ color: brand.secondary_color }}>ونحن نهتم بالباقي.</span>
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/65 sm:text-base">
                  تصفح القائمة، اختر أطباقك، وأرسل الطلب مباشرة إلى المطبخ دون انتظار.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white"><CheckCircle2 size={14} style={{ color: brand.secondary_color }} /> مفتوح الآن</div>
                  <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white/75"><Clock3 size={14} /> {tableLabel}</div>
                </div>
              </div>
              <div className="hidden justify-end lg:flex">
                <div className="w-full max-w-[310px] rounded-[28px] border border-white/10 bg-white/[0.07] p-5 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div><p className="text-[11px] text-white/45">تجربة الطلب</p><p className="mt-1 font-black text-white">بسيطة. سريعة. متصلة.</p></div>
                    <div className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: brand.secondary_color }}><ChefHat size={20} /></div>
                  </div>
                  <div className="mt-5 space-y-2.5">
                    {[
                      [Search, "تصفح المنيو", "اكتشف الوجبات"],
                      [ShoppingBag, "أضف للسلة", "خصص طلبك"],
                      [CheckCircle2, "أرسل الطلب", "يصل للمطبخ مباشرة"],
                    ].map(([Icon, title, text]) => (
                      <div key={title} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10"><Icon size={17} style={{ color: brand.secondary_color }} /></div>
                        <div><p className="text-sm font-bold text-white">{title}</p><p className="text-[10px] text-white/45">{text}</p></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-[70px] z-30 border-b border-black/5 backdrop-blur-xl" style={{ backgroundColor: `${brand.background_color}f2` }}>
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <label className="flex h-12 items-center gap-3 rounded-2xl bg-white px-4 shadow-sm ring-1 ring-black/5">
            <Search size={18} className="opacity-50" />
            <span className="sr-only">ابحث في المنيو</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن وجبتك المفضلة..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            {query && <button onClick={() => setQuery("")} aria-label="مسح البحث" className="grid h-8 w-8 place-items-center rounded-full bg-black/5"><X size={15} /></button>}
          </label>
          <nav aria-label="تصنيفات المنيو" className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((category) => {
              const active = activeCategory === category;
              return <button key={category} onClick={() => chooseCategory(category)} aria-pressed={active} className="shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition" style={active ? { background: brand.button_color, color: "#fff" } : { background: "#fff", color: brand.text_color, boxShadow: "inset 0 0 0 1px rgb(0 0 0 / .06)" }}>{category}</button>;
            })}
          </nav>
        </div>
      </div>

      <main ref={listTop} className="mx-auto max-w-6xl px-4 sm:px-6" style={{ scrollMarginTop: "10rem" }}>
        {addingMore && sessionId && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-black/5">
            <span className="font-bold">تضيف طلبًا جديدًا لنفس الطاولة. طلباتك السابقة مستمرة.</span>
            <button onClick={() => navigate(`/order-tracking?session=${encodeURIComponent(sessionId)}`)} className="font-bold underline-offset-4 hover:underline" style={{ color: brand.primary_color }}>العودة لتتبع الطلبات</button>
          </div>
        )}

        <div className="flex flex-col gap-2 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black" style={{ color: brand.secondary_color }}><span className="h-px w-7" style={{ background: brand.secondary_color }} /> قائمتنا</div>
            <h2 className="text-3xl font-black sm:text-4xl">اختر ما يناسبك</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 opacity-60">أطباق متاحة الآن، مع تجربة طلب مصممة لتكون واضحة وسريعة.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold shadow-sm ring-1 ring-black/5"><span className="h-2 w-2 rounded-full bg-green-500" /> {menuItems.length} صنف متاح</div>
        </div>

        {menuItems.length === 0 ? (
          <div className="rounded-[28px] bg-white px-6 py-16 text-center shadow-sm"><Utensils className="mx-auto opacity-40" size={30} /><p className="mt-3 font-bold">لا توجد أصناف متاحة الآن</p></div>
        ) : visible.length === 0 ? (
          <div className="rounded-[28px] bg-white px-6 py-16 text-center shadow-sm"><Search className="mx-auto opacity-40" size={28} /><p className="mt-3 font-bold">{query ? `لا توجد نتائج لـ «${query}»` : "لا توجد أصناف في هذا التصنيف"}</p><button onClick={() => { setQuery(""); setActiveCategory(ALL); }} className="mt-4 rounded-xl bg-[#1f1d1b] px-5 py-3 text-xs font-bold text-white">عرض جميع المنتجات</button></div>
        ) : (
          sections.map(([category, list]) => (
            <section key={category} className="mt-4 sm:mt-7" aria-labelledby={`cat-${category}`}>
              <div className="mb-3 flex items-end justify-between">
                <h2 id={`cat-${category}`} className="flex items-baseline gap-2 text-xl font-black">{category}<span className="text-xs opacity-45">{list.length}</span></h2>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((item) => {
                  const count = inCart(item.id);
                  const favorite = favorites.has(item.id);
                  return (
                    <li key={item.id}>
                      <article className="group relative h-full overflow-hidden bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg" style={{ borderRadius: radius }}>
                        <button type="button" onClick={() => setSheet({ item, quantity: 1, note: "" })} className="absolute inset-0 z-0" style={{ borderRadius: radius }} aria-label={`تفاصيل ${item.name}`} />
                        <div className="relative h-48 overflow-hidden" style={{ background: `${brand.primary_color}12` }}>
                          <MenuImage src={item.imageUrl} alt={item.name} tint={brand.primary_color} className="h-full w-full transition duration-500 group-hover:scale-105" iconSize={36} />
                          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
                          {count > 0 && <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-[10px] font-black shadow">×{count} في السلة</span>}
                          <button type="button" onClick={(event) => { event.stopPropagation(); toggleFavorite(item.id); }} className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-md" aria-label={favorite ? `إزالة ${item.name} من المفضلة` : `إضافة ${item.name} للمفضلة`}>
                            <Heart size={17} className={favorite ? "fill-red-500 text-red-500" : "text-[#4e4842]"} />
                          </button>
                          {item.badge && <span className="absolute bottom-3 right-3 rounded-full px-3 py-1.5 text-[10px] font-black text-white" style={{ background: brand.secondary_color }}>{item.badge}</span>}
                        </div>
                        <div className="relative z-0 flex min-h-[170px] flex-col p-5 pointer-events-none">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="line-clamp-2 text-lg font-black leading-6">{item.name}</h3>
                            {item.rating && <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#f6f1e8] px-2 py-1 text-[10px] font-black"><Star size={12} className="fill-current" style={{ color: brand.secondary_color }} /> {item.rating}</span>}
                          </div>
                          {item.description && <p className="mt-2 line-clamp-2 text-xs leading-6 opacity-60">{item.description}</p>}
                          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                            <div><span className="text-xl font-black tabular-nums" style={{ color: brand.secondary_color }}>{money(item.price)}</span></div>
                            <button type="button" onClick={(event) => { event.stopPropagation(); quickAdd(item); }} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-xl text-white shadow-md transition active:scale-90" style={{ background: brand.button_color }} aria-label={`إضافة ${item.name} إلى السلة`}><Plus size={19} /></button>
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}

        {brand.show_menupilot_branding && <a href="/" className="mx-auto mt-12 flex w-fit items-center gap-2 text-xs font-bold opacity-50 hover:opacity-100" dir="ltr">Powered by <BrandLogo height={20} /></a>}
      </main>

      <Modal open={Boolean(sheet)} onClose={() => setSheet(null)} title={sheet?.item.name} size="md"
        footer={sheet && <button onClick={addFromSheet} className="flex h-14 w-full items-center justify-between rounded-2xl px-5 text-base font-black text-white" style={{ background: brand.button_color }}><span>أضف إلى السلة</span><span className="tabular-nums">{money(Number(sheet.item.price) * sheet.quantity)}</span></button>}>
        {sheet && (
          <div className="space-y-5">
            <MenuImage src={sheet.item.imageUrl} alt={sheet.item.name} tint={brand.primary_color} iconSize={42} className="aspect-[4/3] w-full rounded-2xl" />
            {sheet.item.description && <p className="text-sm leading-7 opacity-70">{sheet.item.description}</p>}
            <div className="flex items-center justify-between"><span className="font-black">الكمية</span><Stepper large value={sheet.quantity} label={sheet.item.name} color={brand.button_color} onMinus={() => setSheet((s) => ({ ...s, quantity: Math.max(1, s.quantity - 1) }))} onPlus={() => setSheet((s) => ({ ...s, quantity: Math.min(99, s.quantity + 1) }))} /></div>
            <label className="block"><span className="text-sm font-bold">ملاحظة للمطبخ <span className="font-normal opacity-50">(اختياري)</span></span><textarea rows={3} maxLength={500} value={sheet.note} onChange={(e) => setSheet((s) => ({ ...s, note: e.target.value }))} placeholder="مثل: بدون بصل، الصوص جانبًا" className="mt-2 w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/10" /></label>
          </div>
        )}
      </Modal>

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2">
          <button onClick={() => navigate(withSession(`/t/${tableCode}/cart`))} className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between rounded-2xl px-5 text-white shadow-xl transition active:scale-[0.99]" style={{ background: brand.button_color }}>
            <span className="grid h-8 min-w-8 place-items-center rounded-full bg-white/20 px-2 text-sm font-black tabular-nums">{cartCount}</span>
            <span className="text-base font-black">عرض السلة</span>
            <span className="text-base font-black tabular-nums">{money(cartTotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
