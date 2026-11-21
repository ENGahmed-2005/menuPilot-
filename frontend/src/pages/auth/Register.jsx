import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../../components/brand/Logo";
import { QrCode, Truck, PanelsTopLeft, ChartNoAxesCombined } from "lucide-react";
import AuthSubmitButton from "../../components/auth/AuthSubmitButton";
import LanguageSwitch from "../../components/ui/LanguageSwitch";
import FormAlert from "../../components/auth/FormAlert";
import { api } from "../../api/client";
import { dir, lang, t } from "../../i18n";

const fields = [
  ["restaurant_name", "اسم المطعم"],
  ["city", "المدينة"],
  ["address", "العنوان", "text", true],
  ["website_url", "الموقع أو حساب التواصل", "url", true],
  ["owner_name", "اسم المسؤول"],
  ["owner_position", "الصفة"],
  ["email", "البريد الإلكتروني", "email"],
  ["phone", "الهاتف", "tel"],
  ["estimated_tables", "عدد الطاولات التقريبي", "number", true],
];
const types = [
  ["restaurant", "مطعم"], ["cafe", "مقهى"],
  ["fast-food", "وجبات سريعة", "Fast food"], ["delivery_only", "توصيل فقط"],
  ["other", "أخرى"],
];
const services = [
  ["qr", "الطلب عبر QR"], ["management", "إدارة المطعم"],
  ["online", "الطلب الإلكتروني"], ["delivery", "إدارة التوصيل"],
  ["pickup", "طلبات الاستلام"], ["tables", "إدارة الطاولات"],
  ["kitchen", "إدارة المطبخ"], ["cashier", "الكاشير والفواتير"],
  ["reports", "التقارير والتحليلات"],
];
const control = "mt-1.5 block min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-base font-normal text-[#172331] focus:border-copper focus:outline-2 focus:outline-offset-2 focus:outline-copper-ink";
const benefits = [
  [QrCode, "استقبال الطلبات عبر QR مباشرة"],
  [Truck, "إدارة الطلبات الخارجية والتوصيل"],
  [PanelsTopLeft, "شاشات تشغيل مخصصة لكل قسم"],
  [ChartNoAxesCombined, "متابعة الأداء والمبيعات من لوحة واحدة"],
];
const groups = [
  ["بيانات المطعم", ["restaurant_name", "business_type", "city", "address"]],
  ["بيانات التواصل", ["owner_name", "owner_position", "email", "phone", "website_url"]],
  ["سعة المطعم", ["estimated_tables"]],
];
const autocomplete = { restaurant_name: "organization", owner_name: "name", owner_position: "organization-title", email: "email", phone: "tel", city: "address-level2", website_url: "url" };
function Section({ title, children }) {
  return <fieldset className="min-w-0 border-b border-slate-200 pb-6">
    <legend className="mb-4 text-lg font-bold text-[#172331]">{t(title)}</legend>{children}
  </fieldset>;
}
export default function Register() {
  const navigate = useNavigate();
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState([]);
  function feedback(name) {
    return errors[name] && <span id={name + "-error"} className="mt-1 block text-sm text-red-800" role="alert">{errors[name]}</span>;
  }
  function accessibility(name) {
    return { "aria-invalid": !!errors[name], "aria-describedby": errors[name] ? name + "-error" : undefined };
  }
  async function submit(event) {
    event.preventDefault();
    if (lock.current) return;
    const form = event.currentTarget;
    if (!selected.length) {
      setErrors({ requested_services: t("اختر خدمة واحدة على الأقل.") });
      form.querySelector("fieldset input[type=checkbox]").focus();
      return;
    }
    lock.current = true;
    const body = Object.fromEntries(new FormData(form));
    body.requested_services = selected;
    body.consent = body.consent === "on";
    setError("");
    setErrors({});
    setBusy(true);
    try {
      const application = await api.post("/applications", body);
      navigate("/join/received", { state: { reference: application.reference_number } });
    } catch (err) {
      const messages = Object.fromEntries(Object.entries(err.errors || {}).map(([key, value]) =>
        [key.split(".")[0], Array.isArray(value) ? value[0] : value]));
      setErrors(messages);
      setError(err.serverMessage || err.message);
      form.elements.namedItem(Object.keys(messages)[0])?.focus?.();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return <main dir={dir} className="min-h-screen bg-[#f4efe6] font-body text-[#172331] lg:grid lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.45fr)]">
    <aside className="bg-navy px-6 py-5 text-white sm:px-10 lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:self-start lg:flex-col lg:px-[clamp(2rem,4vw,5rem)] lg:py-10">
      <Link to="/" className="inline-flex self-start"><Logo on="dark" height={38} priority /></Link>
      <div className="mt-4 lg:my-auto lg:py-10">
        <h2 className="max-w-md text-2xl font-bold leading-tight sm:text-3xl lg:text-5xl">{t("ابدأ إدارة مطعمك بطريقة أذكى")}</h2>
        <p className="mt-3 max-w-md leading-relaxed text-white/90">{t("انضم إلى MenuPilot واربط طلبات مطعمك ومطبخك وموظفيك وإدارتك في منظومة تشغيل واحدة.")}</p>
        <ul className="mt-8 hidden space-y-5 lg:block">{benefits.map(([Icon, text]) => <li key={text} className="flex items-center gap-3"><Icon size={21} className="shrink-0 text-copper" aria-hidden="true" />{t(text)}</li>)}</ul>
      </div>
      <div className="hidden xl:block"><img src={"/landing/" + lang + "-dashboard.webp"} alt="" className="mb-8 w-full rounded-lg border border-white/20" /></div>
      <small className="hidden text-white/80 lg:block">© {new Date().getFullYear()} MenuPilot</small>
    </aside>
    <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-7 sm:py-8 lg:py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <header className="mb-7 border-b border-slate-200 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">{t("انضم إلى MenuPilot")}</h1><LanguageSwitch /></div>
          <p className="mt-3 leading-relaxed text-slate-700">{t("أرسل طلبك وسيراجعه فريقنا. بعد القبول، نتواصل معك لتوقيع الاتفاقية وتفعيل حساب المطعم.")}</p>
        </header>
        <form onSubmit={submit} aria-busy={busy} className="space-y-6" onChange={event => {
          const name = event.target.name;
          if (errors[name]) setErrors(current => ({ ...current, [name]: undefined }));
        }}>
          {groups.map(([title, names]) => <Section key={title} title={title}><div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">{names.map(name => {
            const [, label, type = "text", optional] = fields.find(field => field[0] === name) || [name, "نوع النشاط"];
            return <label key={name} className="min-w-0 text-sm font-semibold">{t(label)} {optional ? <small className="font-normal text-slate-600">({t("اختياري")})</small> : <span aria-hidden="true">*</span>}
              {name === "business_type" ? <select name={name} required className={control} {...accessibility(name)}>{types.map(([value, text]) => <option key={value} value={value}>{t(text)}</option>)}</select> :
                <input className={control} name={name} type={type} required={!optional} autoComplete={autocomplete[name]} dir={["email","url","tel"].includes(type) ? "ltr" : undefined}
                  min={type === "number" ? 0 : undefined} max={type === "number" ? 10000 : undefined} maxLength={name === "website_url" ? 2048 : 255} {...accessibility(name)} />}
              {feedback(name)}
            </label>;
          })}</div></Section>)}
          <Section title="الخدمات المطلوبة"><div className="grid gap-2 sm:grid-cols-2">
            {services.map(([id, label]) => <label key={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:border-copper has-checked:border-copper-ink has-checked:bg-orange-50 focus-within:outline-2 focus-within:outline-copper-ink">
              <input type="checkbox" className="size-4 shrink-0 accent-[#9a4913]" checked={selected.includes(id)} {...accessibility("requested_services")} onChange={event => {
                const checked = event.target.checked;
                setSelected(current => checked ? [...current, id] : current.filter(value => value !== id));
                setErrors(current => ({ ...current, requested_services: undefined }));
              }} />{t(label)}</label>)}
          </div>{feedback("requested_services")}</Section>
          <Section title="تفاصيل إضافية"><label className="block text-sm font-semibold">{t("ملاحظات أو احتياجات خاصة")} <small>({t("اختياري")})</small>
            <textarea className={control} name="notes" rows={3} maxLength={5000} {...accessibility("notes")} />{feedback("notes")}</label>
          <label className="mt-4 flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1 size-4 shrink-0" name="consent" required {...accessibility("consent")} />
            {t("أوافق على استخدام بياناتي لمراجعة الطلب والتواصل معي بشأنه.")}</label>{feedback("consent")}</Section>
          {error && <FormAlert>{error}</FormAlert>}
          <AuthSubmitButton loading={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-copper px-4 py-3 font-bold text-[#172331] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper-ink disabled:cursor-wait disabled:opacity-60">{t("إرسال طلب الانضمام")}</AuthSubmitButton>
        </form>
        <nav className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold text-[#814214]">
          <Link to="/join/how-it-works">{t("كيف تنضم؟")}</Link><Link to="/founding-partners">{t("برنامج الشركاء المؤسسين")}</Link><Link to="/login">{t("تسجيل الدخول")}</Link>
        </nav>
      </div>
    </div>
  </main>;
}
