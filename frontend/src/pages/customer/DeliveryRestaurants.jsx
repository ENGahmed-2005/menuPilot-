import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bike, Clock3, MapPin, Search, Store, X } from "lucide-react";
import { getDeliveryRestaurants } from "../../api/outsideOrders";
import BrandLogo from "../../components/brand/Logo";
import LanguageSwitch from "../../components/ui/LanguageSwitch";
import { errorText } from "../../utils/errors";
import { money } from "../../utils/format";
import { t, dir } from "../../i18n";

function RestaurantCard({ restaurant }) {
  const [imageFailed, setImageFailed] = useState(false);
  const fee = Math.min(...restaurant.zones.map((zone) => Number(zone.fee)));
  return (
    <article className="flex h-full flex-col rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-copper/10">
          {restaurant.logo_url && !imageFailed
            ? <img src={restaurant.logo_url} alt="" loading="lazy" onError={() => setImageFailed(true)} className="h-full w-full object-contain" />
            : <Store size={28} className="text-copper-ink" aria-hidden="true" />}
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${restaurant.open ? "bg-herb/10 text-herb" : "bg-black/5 text-muted"}`}>
          {restaurant.open ? t("يستقبل الطلبات الآن") : restaurant.paused ? t("مشغول حاليًا") : t("مغلق الآن")}
        </span>
      </div>
      <h2 className="mt-4 break-words text-xl font-black">{restaurant.name}</h2>
      {restaurant.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{restaurant.description}</p>}
      {restaurant.address && <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-muted"><MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{restaurant.address}</p>}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-bold">
        <span className="flex items-center gap-1.5"><Bike size={17} className="text-copper-ink" aria-hidden="true" />{t("التوصيل من {0}", { 0: money(fee) })}</span>
        <span className="flex items-center gap-1.5"><Clock3 size={16} className="text-muted" aria-hidden="true" />{t("التحضير ≈ {0} د", { 0: restaurant.prep_minutes })}</span>
      </div>
      <p className="mt-4 text-xs font-bold text-muted">{t("مناطق التوصيل")}</p>
      <div className="mb-5 mt-2 flex flex-wrap gap-1.5">
        {restaurant.zones.map((zone) => <span key={zone.id} className="rounded-lg bg-paper-2 px-2.5 py-1 text-xs font-bold">{zone.name}</span>)}
      </div>
      {!restaurant.open && restaurant.hours && <p className="mb-3 text-xs text-muted">{t("ساعات الطلب {0}–{1}", { 0: restaurant.hours.opens_at, 1: restaurant.hours.closes_at })}</p>}
      <Link to={`/r/${encodeURIComponent(restaurant.slug)}?type=delivery`} aria-label={t("منيو {0} والتوصيل", { 0: restaurant.name })}
        className={`mt-auto flex min-h-12 items-center justify-between gap-2 rounded-2xl px-4 text-sm font-black transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-copper ${restaurant.open ? "bg-navy text-paper hover:bg-navy/90" : "bg-paper-2 text-ink hover:bg-black/10"}`}>
        {restaurant.open ? t("اطلب توصيل") : t("تصفح المنيو")}
        <ArrowLeft size={18} className="ltr:rotate-180" aria-hidden="true" />
      </Link>
    </article>
  );
}

export default function DeliveryRestaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [openOnly, setOpenOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDeliveryRestaurants()
      .then((data) => { if (!cancelled) setRestaurants(data); })
      .catch((err) => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return restaurants.filter((restaurant) => (!openOnly || restaurant.open)
      && (!needle || [restaurant.name, restaurant.address, ...restaurant.zones.map((zone) => zone.name)].join(" ").toLocaleLowerCase().includes(needle)));
  }, [restaurants, query, openOnly]);

  return (
    <div dir={dir} className="min-h-screen bg-paper-2 text-ink">
      <header className="bg-navy text-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link to="/" aria-label={t("الصفحة الرئيسية")}><BrandLogo on="dark" height={32} /></Link>
          <LanguageSwitch tone="dark" />
        </div>
        <div className="mx-auto max-w-6xl px-5 pb-12 pt-5 sm:px-8 sm:pb-16">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-copper"><Bike size={20} aria-hidden="true" />{t("من المطعم لبابك")}</p>
          <h1 className="text-3xl font-black leading-tight sm:text-5xl">{t("شو حاب تطلب اليوم؟")}</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-paper/75 sm:text-base">{t("تصفح المطاعم التي توصل لمنطقتك، اختر وجبتك وتابع طلبك من مكان واحد.")}</p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-12 sm:px-8">
        <div className="relative -mt-6 rounded-2xl border border-line bg-white p-3 shadow-sm sm:flex sm:items-center sm:gap-4">
          <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-xl bg-paper-2 px-3 focus-within:ring-2 focus-within:ring-copper">
            <Search size={20} className="shrink-0 text-muted" aria-hidden="true" />
            <input type="search" aria-label={t("ابحث باسم المطعم أو منطقة التوصيل")} placeholder={t("ابحث باسم المطعم أو منطقة التوصيل")} value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label={t("مسح البحث")} className="grid h-10 w-10 shrink-0 place-items-center rounded-full"><X size={17} aria-hidden="true" /></button>}
          </div>
          <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 px-2 text-sm font-bold sm:mt-0">
            <input type="checkbox" checked={openOnly} onChange={(event) => setOpenOnly(event.target.checked)} className="h-4 w-4 accent-navy" />{t("يستقبل الطلبات الآن فقط")}
          </label>
        </div>
        <div className="mb-5 mt-8 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">{t("مطاعم التوصيل")}</h2>
          {!loading && !error && <p role="status" className="text-sm text-muted">{t("{0} مطعم", { 0: visible.length })}</p>}
        </div>
        {loading ? (
          <div role="status" aria-label={t("جارٍ تحميل المطاعم…")} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => <div key={index} className="h-80 animate-pulse rounded-3xl bg-black/[0.06]" />)}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-3xl border border-line bg-white px-6 py-12 text-center">
            <h3 className="font-black">{t("تعذّر تحميل المطاعم")}</h3>
            <p className="mt-2 text-sm text-muted">{errorText(error)}</p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-5 min-h-11 rounded-xl bg-navy px-5 text-sm font-bold text-paper">{t("حاول مرة أخرى")}</button>
          </div>
        ) : visible.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visible.map((restaurant) => <RestaurantCard key={restaurant.slug} restaurant={restaurant} />)}</div>
        ) : (
          <div className="rounded-3xl border border-line bg-white px-6 py-12 text-center">
            <Store className="mx-auto text-muted" size={32} aria-hidden="true" />
            <h3 className="mt-4 font-black">{restaurants.length ? t("لا توجد مطاعم مطابقة لبحثك") : t("لا توجد مطاعم توصيل حاليًا")}</h3>
            <p className="mt-2 text-sm text-muted">{restaurants.length ? t("جرّب اسم مطعم أو منطقة أخرى، أو اعرض جميع المطاعم.") : t("ستظهر هنا المطاعم عند تفعيل خدمة التوصيل ومناطقها.")}</p>
            {restaurants.length > 0 && <button type="button" onClick={() => { setQuery(""); setOpenOnly(false); }} className="mt-5 min-h-11 rounded-xl bg-navy px-5 text-sm font-bold text-paper">{t("عرض جميع المطاعم")}</button>}
          </div>
        )}
      </main>
    </div>
  );
}
