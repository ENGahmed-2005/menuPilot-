import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthSubmitButton from "../../components/auth/AuthSubmitButton";
import LanguageSwitch from "../../components/ui/LanguageSwitch";
import FormAlert from "../../components/auth/FormAlert";
import { api } from "../../api/client";
import { t } from "../../i18n";

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
const control = "mt-1 w-full rounded-lg border border-line bg-white p-2.5 text-ink";

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState([]);
  async function submit(event) {
    event.preventDefault();
    if (!selected.length) {
      setError(t("اختر خدمة واحدة على الأقل."));
      return;
    }
    const body = Object.fromEntries(new FormData(event.currentTarget));
    body.requested_services = selected;
    body.consent = body.consent === "on";
    setError("");
    setBusy(true);
    try {
      const application = await api.post("/applications", body);
      navigate("/join/received", { state: { reference: application.reference_number } });
    } catch (err) {
      setError(Object.values(err.errors || {}).flat()[0] || err.serverMessage || err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout title={t("انضم إلى MenuPilot")}
      subtitle={t("أرسل طلبك وسيراجعه فريقنا. بعد القبول، نتواصل معك لتوقيع الاتفاقية وتفعيل حساب المطعم.")}>
      <div className="mb-4 flex justify-end"><LanguageSwitch /></div>
      <h1 className="mb-5 font-display text-3xl text-ink">{t("انضم إلى MenuPilot")}</h1>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label>{t("نوع النشاط")}
            <select className={control} name="business_type" required>
              {types.map(([id, ar]) => <option key={id} value={id}>{t(ar)}</option>)}
            </select>
          </label>
          {fields.map(([name, ar, type = "text", optional]) => (
            <label key={name}>{t(ar)}
              <input className={control} name={name} type={type} required={!optional}
                min={type === "number" ? 0 : undefined} max={type === "number" ? 10000 : undefined} maxLength={name === "website_url" ? 2048 : 255} />
            </label>
          ))}
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-2 font-semibold">{t("الخدمات المطلوبة")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map(([id, ar]) => (
              <label key={id} className="flex gap-2 text-sm">
                <input type="checkbox" checked={selected.includes(id)} onChange={event => {
                  setSelected(current => event.target.checked ? [...current, id] : current.filter(item => item !== id));
                }} />{t(ar)}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">{t("ملاحظات أو احتياجات خاصة")}
          <textarea className={control} name="notes" rows={3} maxLength={5000} />
        </label>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="consent" required />
          <span>{t("أوافق على استخدام بياناتي لمراجعة الطلب والتواصل معي بشأنه.")}</span>
        </label>
        {error && <FormAlert>{error}</FormAlert>}
        <AuthSubmitButton loading={busy}>{t("إرسال الطلب")}</AuthSubmitButton>
      </form>
      <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold text-copper-ink">
        <Link to="/join/how-it-works">{t("كيف تنضم؟")}</Link>
        <Link to="/founding-partners">{t("برنامج الشركاء المؤسسين")}</Link>
      </div>
      <Link className="mt-5 inline-block text-sm font-bold text-copper-ink" to="/login">{t("تسجيل الدخول")}</Link>
    </AuthLayout>
  );
}
