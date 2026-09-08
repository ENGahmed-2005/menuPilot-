import { useMemo, useState } from "react";
import { Minus, Plus, Search, ShoppingBag, Star, Utensils } from "lucide-react";

const categories = ["الكل", "المقبلات", "الوجبات الرئيسية", "المشروبات", "الحلويات"];
const items = [
  { id: 1, name: "برجر كلاسيك", category: "الوجبات الرئيسية", price: 32, description: "لحم مشوي، جبنة، خس وصوص خاص", image: "🍔", rating: 4.8 },
  { id: 2, name: "بيتزا مارغريتا", category: "الوجبات الرئيسية", price: 38, description: "صلصة طماطم وجبنة موزاريلا طازجة", image: "🍕", rating: 4.7 },
  { id: 3, name: "سلطة سيزر", category: "المقبلات", price: 18, description: "خس طازج مع صوص سيزر وقطع دجاج", image: "🥗", rating: 4.6 },
  { id: 4, name: "بطاطا مقرمشة", category: "المقبلات", price: 12, description: "بطاطا ذهبية مع صوص الجبن", image: "🍟", rating: 4.9 },
  { id: 5, name: "موهيتو", category: "المشروبات", price: 14, description: "ليمون ونعناع منعش", image: "🍹", rating: 4.8 },
  { id: 6, name: "تشيز كيك", category: "الحلويات", price: 20, description: "تشيز كيك كريمي مع صوص التوت", image: "🍰", rating: 4.9 },
];

export default function RestaurantMenu() {
  const [active, setActive] = useState("الكل");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const categoryMatch = active === "الكل" || item.category === active;
      const searchMatch = `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [active, query]);

  const qty = (id) => cart.find((x) => x.id === id)?.qty || 0;
  const update = (item, delta) => setCart((prev) => {
    const found = prev.find((x) => x.id === item.id);
    if (!found && delta > 0) return [...prev, { ...item, qty: 1 }];
    return prev.map((x) => x.id === item.id ? { ...x, qty: x.qty + delta } : x).filter((x) => x.qty > 0);
  });

  const count = cart.reduce((sum, x) => sum + x.qty, 0);
  const total = cart.reduce((sum, x) => sum + x.qty * x.price, 0);

  return (
    <div dir="rtl" className="min-h-screen bg-paper-2 pb-32 text-ink">
      <header className="overflow-hidden bg-ink text-paper">
        <div className="mx-auto max-w-6xl px-5 pb-9 pt-7 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-copper text-ink"><Utensils size={20} /></div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.18em] text-copper">MENUPILOT</p>
              <p className="text-xs text-paper/50">القائمة الرقمية</p>
            </div>
          </div>
          <div className="mt-9">
            <p className="text-sm font-semibold text-copper">مرحبًا بك في</p>
            <h1 className="mt-2 font-display text-5xl">مطعم الذوق</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-paper/60">اكتشف أطباقنا المختارة بعناية وأضف ما ترغب به إلى طلبك.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <div className="relative">
          <Search className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft/50" size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن طبق أو مكوّن…" className="w-full rounded-2xl border border-ink/10 bg-white py-3.5 pl-4 pr-12 text-sm outline-none transition focus:border-copper focus:ring-4 focus:ring-copper/10" />
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button key={category} onClick={() => setActive(category)} className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold transition ${active === category ? "bg-ink text-paper shadow-sm" : "border border-ink/10 bg-white text-ink-soft hover:border-ink/20"}`}>
              {category}
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-ink-soft/50">اختياراتنا</p>
            <h2 className="mt-1 font-display text-3xl">القائمة</h2>
          </div>
          <span className="text-xs text-ink-soft/50">{filtered.length} أصناف</span>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 rounded-[2rem] border border-dashed border-ink/15 bg-white p-10 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-copper/10 text-copper"><Search /></div>
            <h3 className="mt-4 font-bold">لم نجد ما تبحث عنه</h3>
            <p className="mt-1 text-sm text-ink-soft">جرّب اسم طبق مختلف أو غيّر التصنيف.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <article key={item.id} className="group overflow-hidden rounded-[2rem] border border-ink/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative grid h-48 place-items-center bg-copper/10 text-7xl transition group-hover:bg-copper/15">{item.image}</div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-copper-deep">{item.category}</span>
                      <h3 className="mt-1 text-xl font-black">{item.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-ink-soft/70">{item.description}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-copper/10 px-2 py-1 text-xs font-bold text-copper-deep"><Star size={13} fill="currentColor" />{item.rating}</span>
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <b className="text-lg text-copper-deep">₪{item.price}</b>
                    {qty(item.id) === 0 ? (
                      <button onClick={() => update(item, 1)} className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-paper transition hover:bg-ink-soft"><Plus size={16} /> إضافة</button>
                    ) : (
                      <div className="flex items-center gap-3 rounded-xl bg-ink px-2 py-1.5 text-paper">
                        <button aria-label={`زيادة ${item.name}`} onClick={() => update(item, 1)} className="rounded-lg p-1.5 hover:bg-paper/10"><Plus size={16} /></button>
                        <b className="min-w-5 text-center">{qty(item.id)}</b>
                        <button aria-label={`تقليل ${item.name}`} onClick={() => update(item, -1)} className="rounded-lg p-1.5 hover:bg-paper/10"><Minus size={16} /></button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {count > 0 && (
        <div className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-xl items-center justify-between gap-4 rounded-2xl bg-ink p-4 text-paper shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-paper/10">
              <ShoppingBag size={20} />
              <b className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-copper text-[10px] text-ink">{count}</b>
            </span>
            <div><b className="text-sm">طلبك</b><p className="mt-0.5 text-xs text-paper/50">{count} صنف • ₪{total}</p></div>
          </div>
          <button className="rounded-xl bg-copper px-5 py-2.5 text-sm font-black text-ink transition hover:bg-copper-deep">عرض السلة</button>
        </div>
      )}
    </div>
  );
}
