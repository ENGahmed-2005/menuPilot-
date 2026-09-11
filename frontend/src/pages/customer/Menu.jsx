import { useEffect, useMemo, useState } from "react";
import { Check, Search, ShoppingBag, Plus, Utensils, ChevronLeft, AlertCircle } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getPublicMenuByTableCode } from "../../api/menu";
import { useCart } from "../../context/CartContext";
import Spinner from "../../components/ui/Spinner";

export default function Menu() {
  const { tableCode } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const { addItem, items } = useCart();
  const [menuItems, setMenuItems] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [addedItem, setAddedItem] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getPublicMenuByTableCode(tableCode)
      .then((result) => {
        if (!cancelled) {
          setMenuItems(result.items || []);
          setRestaurant(result.table || null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [tableCode]);

  useEffect(() => {
    if (!addedItem) return undefined;
    const timer = setTimeout(() => setAddedItem(""), 1600);
    return () => clearTimeout(timer);
  }, [addedItem]);

  const categories = useMemo(
    () => ["الكل", ...new Set(menuItems.map((item) => item.category).filter(Boolean))],
    [menuItems]
  );

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesCategory = activeCategory === "الكل" || item.category === activeCategory;
      const matchesQuery = !normalized || `${item.name} ${item.description || ""}`.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [menuItems, query, activeCategory]);

  const cartCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const cartPath = `/t/${tableCode}/cart${sessionId ? `?session=${encodeURIComponent(sessionId)}` : ""}`;

  function handleAdd(item) {
    addItem(item);
    setAddedItem(item.id);
  }

  if (loading) return <Spinner label="جارِ تجهيز قائمتك…" />;

  if (error) {
    return (
      <div dir="rtl" className="grid min-h-screen place-items-center bg-paper-2 px-6 text-center text-ink">
        <div className="w-full max-w-sm rounded-[28px] border border-brick/15 bg-paper p-8 shadow-xl">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brick/10 text-brick"><AlertCircle size={25} /></div>
          <h1 className="mt-5 text-2xl font-bold">تعذّر تحميل القائمة</h1>
          <p role="alert" className="mt-2 text-sm leading-7 text-ink-soft">{error.message || "حدث خطأ غير متوقع."}</p>
          <button onClick={() => window.location.reload()} className="mt-6 w-full rounded-2xl bg-ink px-5 py-3 text-sm font-bold text-paper transition hover:bg-ink-soft">حاول مرة أخرى</button>
        </div>
      </div>
    );
  }

  const restaurantName = restaurant?.restaurant_name || restaurant?.restaurantName || "مطعمك المفضل";

  return (
    <div dir="rtl" className="min-h-screen bg-paper-2 pb-32 text-ink">
      <header className="relative overflow-hidden bg-ink text-paper">
        <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-copper/15 blur-3xl" />
        <div className="absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-herb/10 blur-3xl" />
        <div className="mx-auto max-w-5xl px-5 pb-8 pt-6 sm:px-8 sm:pt-8">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-copper text-ink shadow-lg"><Utensils size={20} /></div>
              <div className="min-w-0">
                <p className="truncate text-base font-black">{restaurantName}</p>
                <p className="text-xs text-paper/55">طاولة {tableCode}</p>
              </div>
            </div>
            <button onClick={() => navigate(cartPath)} aria-label="فتح السلة" className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-paper/10 bg-paper/5 transition hover:bg-paper/10">
              <ShoppingBag size={20} />
              {cartCount > 0 && <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-copper px-1 text-[10px] font-black text-ink">{cartCount}</span>}
            </button>
          </div>
          <div className="mt-8">
            <p className="text-sm font-medium text-copper">أهلاً بك 👋</p>
            <h1 className="mt-1 text-4xl font-black leading-tight sm:text-5xl">ماذا ترغب اليوم؟</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-paper/55">تصفح القائمة واختر طلبك. سيصل مباشرةً إلى المطبخ.</p>
          </div>
          <label className="mt-6 flex items-center gap-3 rounded-2xl bg-paper px-4 py-3 text-ink shadow-xl">
            <Search size={19} className="text-ink-soft/60" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن طبق…" aria-label="البحث عن طبق" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-soft/45" />
          </label>
        </div>
      </header>

      {addedItem && <div role="status" className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-sm items-center justify-center gap-2 rounded-2xl bg-herb px-4 py-3 text-sm font-bold text-paper shadow-xl"><Check size={17} /> تمت إضافة الطبق إلى السلة</div>}

      <main className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="-mt-1 flex gap-2 overflow-x-auto py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => <button key={category} onClick={() => setActiveCategory(category)} aria-pressed={activeCategory === category} className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold transition ${activeCategory === category ? "bg-ink text-paper shadow-md" : "border border-ink/10 bg-paper text-ink-soft hover:border-ink/20"}`}>{category}</button>)}
        </div>

        <div className="mb-5 flex items-end justify-between">
          <div><p className="text-xs font-medium text-ink-soft/60">اكتشف قائمتنا</p><h2 className="mt-1 text-2xl font-bold">الأطباق المتاحة</h2></div>
          <span className="text-xs text-ink-soft/55">{filteredItems.length} طبق</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-ink/15 bg-paper p-10 text-center"><Search className="mx-auto text-ink-soft/35" size={28} /><p className="mt-3 font-bold">القائمة فارغة حاليًا</p><p className="mt-1 text-sm text-ink-soft/60">لم تتم إضافة أطباق متاحة لهذا المطعم بعد.</p></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <article key={item.id} className="group overflow-hidden rounded-3xl border border-ink/10 bg-paper shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="relative aspect-[4/3] overflow-hidden bg-ink/5">
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center"><Utensils className="text-copper" size={42} /></div>}
                  {item.category && <span className="absolute right-3 top-3 rounded-full bg-paper/90 px-3 py-1 text-[11px] font-bold text-ink backdrop-blur">{item.category}</span>}
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold">{item.name}</h3>
                  <p className="mt-2 min-h-12 text-sm leading-6 text-ink-soft/65">{item.description || "طبق محضر بعناية ليمنحك تجربة لذيذة."}</p>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="text-lg font-black text-copper-deep">{item.price} ₪</span>
                    <button onClick={() => handleAdd(item)} className="flex items-center gap-2 rounded-2xl bg-ink px-4 py-2.5 text-sm font-bold text-paper transition hover:bg-ink-soft active:scale-95"><Plus size={17} /> إضافة</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {cartCount > 0 && <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-5xl"><button onClick={() => navigate(cartPath)} className="flex w-full items-center justify-between rounded-2xl bg-ink px-5 py-4 text-paper shadow-2xl transition hover:-translate-y-0.5"><span className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-paper/10"><ShoppingBag size={19} /></span><span className="text-right"><b className="block text-sm">عرض طلبك</b><span className="text-xs text-paper/50">{cartCount} عناصر في السلة</span></span></span><span className="flex items-center gap-1 rounded-xl bg-copper px-4 py-2.5 text-sm font-black text-ink">السلة <ChevronLeft size={17} /></span></button></div>}
    </div>
  );
}
