import { useEffect, useState } from "react";
import { Building2, ChevronLeft, Mail, Palette, MapPin, Phone, Save, CreditCard, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getSubscriptionPlan } from "../../config/subscriptions";
import { getRestaurant, updateRestaurant } from "../../api/restaurant";
import Card from "../../components/dashboard/Card";
import PageHeader from "../../components/dashboard/PageHeader";
import Button from "../../components/ui/Button";
import Spinner from "../../components/ui/Spinner";

const fieldClass = "w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-copper focus:ring-4 focus:ring-copper/10";
const emptyPayments = { bank: { enabled: false, name: "", account_name: "", account_number: "", qr_url: "" }, wallet: { enabled: false, name: "", account_name: "", account_number: "", qr_url: "" } };

export default function RestaurantSettings() {
  const { user } = useAuth();
  const plan = getSubscriptionPlan(user?.plan);
  const [form, setForm] = useState({ restaurant_name: "", restaurant_phone: "", restaurant_description: "", restaurant_address: "", latitude: "", longitude: "", payment_methods: emptyPayments });
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");

  useEffect(() => {
    getRestaurant().then((data) => setForm({
      restaurant_name: data?.restaurant_name || data?.restaurantName || "",
      restaurant_phone: data?.restaurant_phone || "", restaurant_description: data?.restaurant_description || "",
      restaurant_address: data?.restaurant_address || "", latitude: data?.latitude ?? "", longitude: data?.longitude ?? "",
      payment_methods: { ...emptyPayments, ...(data?.payment_methods || {}) },
    })).catch(() => setForm((current) => ({ ...current, restaurant_name: user?.restaurantName || user?.name || "" }))).finally(() => setLoading(false));
  }, [user?.restaurantName, user?.name]);

  const set = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }));
  const setPayment = (method, key) => (e) => setForm((current) => ({ ...current, payment_methods: { ...current.payment_methods, [method]: { ...current.payment_methods[method], [key]: key === "enabled" ? e.target.checked : e.target.value } } }));

  async function save(e) {
    e.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      await updateRestaurant({ ...form, latitude: form.latitude === "" ? null : Number(form.latitude), longitude: form.longitude === "" ? null : Number(form.longitude) });
      setMessage("تم حفظ بيانات المطعم وطرق الدفع بنجاح.");
    } catch (err) { setError(err?.message || "تعذر حفظ بيانات المطعم."); } finally { setSaving(false); }
  }

  function useCurrentLocation() {
    setError("");
    if (!navigator.geolocation) { setError("المتصفح لا يدعم تحديد الموقع."); return; }
    navigator.geolocation.getCurrentPosition(({ coords }) => setForm((current) => ({ ...current, latitude: coords.latitude.toFixed(7), longitude: coords.longitude.toFixed(7) })), () => setError("تعذر الحصول على موقع المطعم. اسمح للموقع من إعدادات المتصفح."));
  }

  return <div dir="rtl" className="space-y-7">
    <PageHeader title="إعدادات المطعم" subtitle="بيانات المطعم وموقعه وطرق الدفع التي ستظهر للعميل قبل إرسال الطلب." />
    {loading ? <Spinner label="جارِ تحميل إعدادات المطعم…" /> : <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
      <Card as="form" onSubmit={save} className="p-6 sm:p-8">
        {message && <div className="mb-5 rounded-xl bg-herb/10 px-4 py-3 text-sm font-bold text-herb">{message}</div>}
        {error && <div role="alert" className="mb-5 rounded-xl bg-brick/10 px-4 py-3 text-sm font-bold text-brick">{error}</div>}
        <div className="mb-6 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-copper/10 text-copper"><Building2 size={20}/></span><div><h2 className="text-xl font-black">بيانات المطعم</h2><p className="text-xs text-ink-soft/55">هذه البيانات تظهر في تجربة العملاء واللوحات.</p></div></div>
        <div className="grid gap-5 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-bold">اسم المطعم</label><input className={fieldClass} value={form.restaurant_name} onChange={set("restaurant_name")} required /></div><div><label className="mb-2 block text-sm font-bold">هاتف المطعم</label><div className="relative"><Phone className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft/40" size={17}/><input className={`${fieldClass} pr-11`} value={form.restaurant_phone} onChange={set("restaurant_phone")} type="tel" /></div></div></div>
        <div className="mt-5"><label className="mb-2 block text-sm font-bold">العنوان</label><div className="relative"><MapPin className="pointer-events-none absolute right-4 top-4 text-ink-soft/40" size={17}/><input className={`${fieldClass} pr-11`} value={form.restaurant_address} onChange={set("restaurant_address")} placeholder="عنوان المطعم" /></div></div>
        <div className="mt-5"><label className="mb-2 block text-sm font-bold">وصف المطعم</label><textarea className={`${fieldClass} min-h-28 resize-y`} value={form.restaurant_description} onChange={set("restaurant_description")} placeholder="وصف مختصر يظهر للعملاء" /></div>

        <div className="mt-7 rounded-2xl border border-copper/20 bg-copper/5 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">موقع المطعم</h3><p className="mt-1 text-xs leading-5 text-ink-soft/60">يُستخدم للتحقق من وجود العميل داخل نطاق المطعم عند فتح جلسة QR.</p></div><button type="button" onClick={useCurrentLocation} className="rounded-full border border-copper/30 px-4 py-2 text-xs font-black text-copper-deep hover:bg-copper/10">استخدم موقعي الحالي</button></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-xs font-bold">Latitude</label><input className={fieldClass} value={form.latitude} onChange={set("latitude")} type="number" step="any" required /></div><div><label className="mb-2 block text-xs font-bold">Longitude</label><input className={fieldClass} value={form.longitude} onChange={set("longitude")} type="number" step="any" required /></div></div></div>

        <div className="mt-7"><div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-copper/10 text-copper"><CreditCard size={18}/></span><div><h3 className="font-black">طرق الدفع الإلكتروني</h3><p className="text-xs text-ink-soft/55">فعّل الطريقة وأدخل بيانات التحويل التي ستظهر للعميل.</p></div></div>
          {[['bank','التحويل البنكي'],['wallet','المحفظة الإلكترونية']].map(([method,label]) => <div key={method} className="mb-4 rounded-2xl border border-ink/10 p-4"><label className="flex items-center gap-3 font-bold"><input type="checkbox" checked={Boolean(form.payment_methods[method]?.enabled)} onChange={setPayment(method,"enabled")} /> {label}</label>{form.payment_methods[method]?.enabled && <div className="mt-4 grid gap-3 sm:grid-cols-2"><input className={fieldClass} placeholder="اسم البنك / المحفظة" value={form.payment_methods[method]?.name || ""} onChange={setPayment(method,"name")} /><input className={fieldClass} placeholder="اسم صاحب الحساب" value={form.payment_methods[method]?.account_name || ""} onChange={setPayment(method,"account_name")} /><input className={fieldClass} placeholder="رقم الحساب / رقم الجوال" value={form.payment_methods[method]?.account_number || ""} onChange={setPayment(method,"account_number")} /><input className={fieldClass} placeholder="رابط QR Code (اختياري)" value={form.payment_methods[method]?.qr_url || ""} onChange={setPayment(method,"qr_url")} type="url" /></div>}</div>)}
        </div>
        <div className="mt-7 flex justify-end"><Button type="submit" disabled={saving}><Save size={16}/> {saving ? "جارِ الحفظ…" : "حفظ التغييرات"}</Button></div>
      </Card>
      <div className="space-y-5"><Card className="p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-copper/10 text-copper"><Mail size={19}/></span><div><h2 className="font-black">{form.restaurant_name || "مطعمي"}</h2><p className="text-xs text-ink-soft/55">{user?.email || ""}</p></div></div><div className="mt-5 grid gap-2"><Link to={`/owner/subscription/${plan.id}`} className="flex items-center justify-between rounded-xl bg-ink px-4 py-3 text-sm font-black text-paper">{plan.name} <ChevronLeft size={16}/></Link><Link to="/owner/theme" className="flex items-center justify-between rounded-xl bg-copper px-4 py-3 text-sm font-black text-ink">تخصيص المظهر <Palette size={16}/></Link></div></Card><Card className="p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-copper/10 text-copper"><WalletCards size={19}/></span><div><h2 className="font-black">الدفع النقدي</h2><p className="text-xs text-ink-soft/55">متاح دائمًا مع تأكيد النادل.</p></div></div></Card></div>
    </div>}
  </div>;
}
