import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { lang } from "../../i18n";

const label = (ar, en) => lang === "ar" ? ar : en;
const fields = [
  ["restaurant_name", "اسم المطعم", "Restaurant name"],
  ["restaurant_phone", "هاتف المطعم", "Restaurant phone", "tel", 40],
  ["restaurant_address", "عنوان المطعم", "Restaurant address"],
  ["name", "اسم المالك", "Owner name"],
  ["email", "بريد المالك", "Owner email", "email"],
  ["reason", "سبب الإنشاء", "Reason for creation", "text", 500],
  ["notes", "ملاحظات (اختياري)", "Notes (optional)", "text", 2000],
];

const createRestaurantLabel = label("إنشاء مطعم", "Create restaurant");

export default function CreateRestaurant({ onClose, onCreated }) {
  const [type, setType] = useState("demo_trial");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const agreement = type === "contract" || type === "founding_partner";

  async function submit(event) {
    event.preventDefault();
    if (submitting.current || agreement) return;
    submitting.current = true;
    const body = Object.fromEntries(new FormData(event.currentTarget));
    setSaving(true);
    setError(null);
    try {
      await api.post("/admin/restaurants/manual", body);
      onCreated(label("أُنشئ الحساب وطُلب إرسال دعوة للمالك.", "Account created and owner invitation requested."));
    } catch (err) {
      setError(err);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return <Modal open size="lg" title={createRestaurantLabel} onClose={saving ? undefined : onClose}>
    <form onSubmit={submit} className="space-y-4">
      <label className="block font-semibold">{label("نوع الحساب", "Account type")}
        <select className="mt-1 block w-full rounded-lg border border-line bg-surface p-2" name="account_type" value={type} onChange={event => {
          setType(event.target.value);
          setError(null);
        }}>
          <option value="demo_trial">{label("عرض أو تجربة مجانية", "Demo or free trial")}</option>
          <option value="manual_account">{label("حساب يدوي", "Manual account")}</option>
          <option value="founding_partner">{label("شريك مؤسس", "Founding partner")}</option>
          <option value="contract">{label("عقد", "Contract")}</option>
        </select>
      </label>
      {agreement ? <div className="space-y-3">
        <p>{label("اختر الطلب وأكمل إجراءات الاتفاقية والتحقق قبل تفعيل الحساب.", "Select the application and complete agreement verification before activating the account.")}</p>
        <Link className="font-bold text-copper-ink underline" to={type === "contract" ? "/admin/contracts" : "/admin/founding-partners"}>{label("فتح مسار الاتفاقيات", "Open agreement workflow")}</Link>
        {" · "}
        <Link className="font-bold text-copper-ink underline" to="/admin/applications">{label("عرض الطلبات", "View applications")}</Link>
      </div> : <>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(([name, ar, en, inputType = "text", maxLength = 255]) =>
            <Input key={name} name={name} label={label(ar, en)} type={inputType} maxLength={maxLength} required={name !== "notes"} />)}
          <Input name="application_id" type="number" min={1} label={label("رقم الطلب المرتبط (اختياري)", "Linked application ID (optional)")} />
          <label className="block font-semibold">{label("الباقة", "Plan")}
            <select key={type} className="mt-1 block w-full rounded-lg border border-line bg-surface p-2" name="plan">
              {type === "demo_trial" && <option value="trial">{label("تجربة بكامل الميزات", "Full-access trial")}</option>}
              <option value="basic">Basic</option><option value="pro">Pro</option>
              <option value="delivery_only">{label("التوصيل فقط", "Delivery only")}</option>
            </select>
          </label>
          {type === "demo_trial" && <Input name="trial_days" type="number" min={1} max={365} required label={label("مدة التجربة بالأيام", "Trial duration in days")} />}
        </div>
        {error && <Alert tone="danger">
          <p>{error.message}</p>
          {error.errors && <ul className="list-disc ps-5">{Object.entries(error.errors).map(([field, messages]) =>
            <li key={field}>{Array.isArray(messages) ? messages.join(" ") : messages}</li>)}</ul>}
        </Alert>}
        <Button type="submit" loading={saving}>{createRestaurantLabel}</Button>
      </>}
    </form>
  </Modal>;
}
