import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, authHeaders } from "../../api/client";
import { API_BASE_URL } from "../../api/baseUrl";
import AdminPageShell from "../../components/layout/AdminPageShell";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";
import { t } from "../../i18n";

const input = "w-full rounded-lg border border-line bg-surface p-2 text-ink";
const panel = "rounded-xl border border-line bg-surface p-5";
const states = {
  pending: t("جديد"), under_review: t("قيد المراجعة"),
  more_info_required: t("معلومات إضافية"), approved: t("مقبول"),
  rejected: t("مرفوض"), converted: t("مفعّل"),
  draft: t("مسودة"), awaiting_signature: t("بانتظار التوقيع"),
  signed_pending_verification: t("بانتظار التحقق"), signed: t("موقّع"),
  active: t("نشط"), expired: t("منتهٍ"), cancelled: t("ملغى"),
  terminated: t("مفسوخ"), negotiating: t("قيد التفاوض"), closed: t("مغلق"),
};
const tones = {
  approved: "success", converted: "success", signed: "success", active: "success",
  pending: "warning", more_info_required: "warning", awaiting_signature: "warning",
  signed_pending_verification: "warning", under_review: "info", negotiating: "info",
  rejected: "danger", cancelled: "danger", terminated: "danger",
};
const types = {
  subscription: t("اشتراك"), founding_partner: t("شريك مؤسس"),
  trial: t("تجربة"), custom: t("خاص"), addendum: t("ملحق"),
};
const actions = {
  pending: ["under_review", "more_info_required", "approved", "rejected"],
  under_review: ["more_info_required", "approved", "rejected"], more_info_required: ["under_review", "approved", "rejected"],
  approved: ["under_review"], rejected: ["under_review"],
};
const title = {
  applications: t("طلبات الانضمام"),
  contracts: t("إدارة العقود"),
  "founding-partners": t("المطاعم الشريكة المؤسسة"),
  "founding-partner-settings": t("إعدادات البرنامج"),
  "contract-templates": t("قوالب العقود"),
};
const nameOf = key => key.replaceAll("_", " ");
const display = value => Array.isArray(value) ? value.join(", ") : value ?? "—";

function Field({ name, label, value, options, required, type = "text", onChange, ...props }) {
  const attributes = { name, required, className: input, ...(onChange ? { value, onChange } : { defaultValue: value }), ...props };
  return <label className="grid gap-1 text-sm font-medium">
    <span>{label || nameOf(name)}</span>
    {options ? <select {...attributes}>{Object.entries(options).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select>
      : type === "textarea" ? <textarea {...attributes} rows={3} /> : <input {...attributes} type={type} />}
  </label>;
}

function Details({ data, fields }) {
  return <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {Object.entries(fields).map(([key, label]) => <div key={key}><dt className="text-xs font-bold text-muted">{label}</dt>
      <dd dir="auto" className="whitespace-pre-wrap break-words">{display(data[key])}</dd></div>)}
  </dl>;
}

function Table({ rows, columns, base }) {
  if (!rows.length) return <p className={panel}>{t("لا توجد نتائج.")}</p>;
  return <div className="admin-table-card"><div className="admin-table-wrapper"><table className="admin-table">
    <thead><tr>{Object.values(columns).map(text => <th key={text}>{text}</th>)}{base && <th>{t("التفاصيل")}</th>}</tr></thead>
    <tbody>{rows.map(row => <tr key={row.id || row.cohort}>
      {Object.keys(columns).map(key => <td key={key}>{key.includes("status") && states[row[key]] ? <Badge tone={tones[row[key]] || "neutral"}>{states[row[key]]}</Badge> : display(row[key])}</td>)}
      {base && <td><Link className="font-bold text-copper-ink" to={base + "/" + row.id}>{t("عرض")}</Link></td>}
    </tr>)}</tbody>
  </table></div></div>;
}

function ContractForm({ templates, data, submit, busy }) {
  const [type, setType] = useState(data?.contract_type || "subscription");
  const terms = data?.terms || {};
  const matches = Object.fromEntries(templates.filter(item => item.contract_type === type).map(item => [item.id, item.name + " v" + item.version]));
  return <form className={panel + " space-y-4"} onSubmit={submit}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field name="contract_type" label={t("نوع العقد")} options={types} value={type} onChange={event => setType(event.target.value)} />
      <Field key={type} name="template_id" label={t("القالب")} options={matches} value={data?.template_id} required />
      <Field name="plan" label={t("الباقة")} options={{ basic: "Basic", pro: "Pro", trial: t("تجربة"), delivery_only: t("توصيل فقط") }} value={terms.plan} />
      <Field name="signing_method" label={t("طريقة التوقيع")} options={{ paper: t("ورقي") }} />
      <Field name="company_name" label={t("اسم الشركة")} value={terms.company_name} required />
      <Field name="company_representative" label={t("ممثل MenuPilot")} value={terms.company_representative} required />
      <Field name="company_title" label={t("صفة ممثل MenuPilot")} value={terms.company_title} required />
      <Field name="restaurant_representative" label={t("ممثل المطعم")} value={terms.restaurant_representative} required />
      <Field name="restaurant_title" label={t("صفة ممثل المطعم")} value={terms.restaurant_title} required />
      <Field name="amount" label={t("السعر")} value={terms.amount} type="number" min="0" step="0.01" required />
      <Field name="currency" label={t("العملة")} value={terms.currency} pattern="[A-Z]{3}" required />
      <Field name="billing_cycle" label={t("دورة الدفع")} options={{ monthly: t("شهري"), annual: t("سنوي"), one_time: t("مرة واحدة") }} value={terms.billing_cycle} />
      <Field name="start_date" label={t("تاريخ البدء")} type="date" value={data?.start_date} required />
      <Field name="end_date" label={t("تاريخ الانتهاء")} type="date" value={data?.end_date} required />
      <Field name="trial_days" label={t("أيام التجربة")} type="number" min="1" max="365" value={terms.trial_days} />
    </div>
    <Field name="services" label={t("الخدمات المشمولة")} type="textarea" value={terms.services} required />
    <Field name="discounts" label={t("الخصومات")} value={terms.discounts} />
    <Field name="special_terms" label={t("الشروط الخاصة")} type="textarea" value={terms.special_terms} />
    <p className="text-sm text-muted">{t("التوقيع الإلكتروني غير متاح حالياً.")}</p>
    {!Object.keys(matches).length && <Link to="/admin/contract-templates" className="block text-copper-ink">{t("أضف قالباً لهذا النوع أولاً")}</Link>}
    <Button type="submit" loading={busy} disabled={!Object.keys(matches).length}>{t("حفظ المسودة")}</Button>
  </form>;
}

export default function RestaurantOnboarding({ section }) {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewStatus, setReviewStatus] = useState("");
  const [confirm, dialog] = useConfirm();
  const toast = useToast();
  const base = "/admin/" + section;
  const path = base + (id ? "/" + id : "");
  const query = params.toString();
  const appId = params.get("application");
  const create = section === "contracts" && !id && appId;
  const report = err => setError(Object.values(err.errors || {}).flat()[0] || err.serverMessage || err.message);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    const extras = section === "contracts" && (create || id)
      ? api.get("/admin/contract-templates") : Promise.resolve([]);
    const partnerSettings = section === "applications" && id || section === "founding-partners"
      ? api.get("/admin/founding-partner-settings") : Promise.resolve([]);
    Promise.all([create ? Promise.resolve(null) : api.get(path + (!id && query ? "?" + query : "")), extras, partnerSettings])
      .then(([result, available, settings]) => {
        if (!current) return;
        setData(result); setTemplates(available); setCohorts(settings);
      })
      .catch(err => { if (current) { setData(null); report(err); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [path, query, id, section, create, revision]);

  async function mutate(call, confirmation) {
    if (confirmation && !await confirm({ title: confirmation, confirmLabel: t("تأكيد") })) return null;
    setBusy(true);
    setError("");
    try {
      const result = await call();
      setRevision(value => value + 1);
      toast.success(t("تم الحفظ."));
      return result;
    } catch (err) {
      report(err);
      return null;
    } finally {
      setBusy(false);
    }
  }
  function form(event, call, confirmation) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    return mutate(() => call(body), confirmation);
  }
  async function documentAction(document, preview) {
    setError("");
    const windowRef = preview ? window.open("about:blank", "_blank") : null;
    if (windowRef) windowRef.opener = null;
    try {
      const response = await fetch(API_BASE_URL + path + "/documents/" + document.id, { credentials: "same-origin", headers: authHeaders() });
      if (!response.ok) throw new Error(t("تعذّر فتح الوثيقة."));
      const url = URL.createObjectURL(await response.blob());
      if (windowRef) windowRef.location.replace(url);
      else {
        const link = window.document.createElement("a");
        link.href = url;
        link.download = document.mime_type === "application/pdf" ? "contract.pdf" : "contract.html";
        link.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      windowRef?.close();
      report(err);
    }
  }
  async function upload(event) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    await mutate(async () => {
      const response = await fetch(API_BASE_URL + path + "/upload-document", {
        method: "POST", credentials: "same-origin", headers: { Accept: "application/json", ...authHeaders() }, body,
      });
      const payload = await response.json();
      if (!response.ok) throw Object.assign(new Error(payload.message), { errors: payload.errors });
      return payload.data;
    });
  }
  function pageBy(delta) {
    const next = new URLSearchParams(params);
    next.set("page", String(Number(params.get("page") || 1) + delta));
    setParams(next);
  }
  const rows = section === "applications" ? data?.rows : data;
  const ready = !loading && data;
  return <AdminPageShell>
    {dialog}
    <section className="admin-heading"><div><h1>{title[section]}</h1>
      {id && <Link to={base} className="font-bold text-copper-ink">{t("العودة إلى القائمة")}</Link>}</div>
      {section === "contracts" && <Link to="/admin/contract-templates" className="text-copper-ink">{title["contract-templates"]}</Link>}
      {section === "founding-partners" && <Link to="/admin/founding-partner-settings" className="text-copper-ink">{title["founding-partner-settings"]}</Link>}
    </section>
    <div className="space-y-4">
      {error && <Alert tone="danger">{error}</Alert>}
      {loading && <p role="status">{t("جارٍ التحميل…")}</p>}
      {!loading && !data && !create && <Button onClick={() => setRevision(value => value + 1)}>{t("إعادة المحاولة")}</Button>}
      {!loading && create && <ContractForm templates={templates} busy={busy} submit={async event => {
        const result = await form(event, body => api.post(base, { ...body, application_id: appId }));
        if (result) window.location.assign(base + "/" + result.id);
      }} />}
      {ready && !id && ["applications", "contracts"].includes(section) && <>
        {section === "applications" && <div className="flex flex-wrap gap-3">
          {Object.keys(actions).map(key => <span key={key} className="rounded-full bg-paper-2 px-3 py-1 text-sm">{states[key]} {data.counts[key] || 0}</span>)}
          <span className="rounded-full bg-paper-2 px-3 py-1 text-sm">{t("الإجمالي")} {Object.values(data.counts).reduce((sum, value) => sum + Number(value), 0)}</span>
        </div>}
        <form key={query} className={panel + " flex flex-wrap items-end gap-3"} onSubmit={event => {
          event.preventDefault();
          setParams(Object.fromEntries([...new FormData(event.currentTarget)].filter(([, value]) => value)));
        }}>
          {section === "applications" && <>
            <Field name="q" label={t("بحث")} value={params.get("q") || ""} />
            <Field name="from" label={t("من تاريخ")} type="date" value={params.get("from") || ""} />
            <Field name="to" label={t("إلى تاريخ")} type="date" value={params.get("to") || ""} />
          </>}
          <Field name="status" label={t("الحالة")} value={params.get("status") || ""}
            options={{ "": t("الكل"), ...Object.fromEntries(Object.entries(states).slice(section === "applications" ? 0 : 6, section === "applications" ? 6 : 14)) }} />
          <Button type="submit">{t("تصفية")}</Button>
        </form>
        <Table rows={rows.data} base={base} columns={section === "applications" ? {
          reference_number: t("رقم الطلب"), restaurant_name: t("المطعم"), owner_name: t("المسؤول"),
          phone: t("الهاتف"), city: t("المدينة"), status: t("الحالة"),
          created_at: t("التقديم"), updated_at: t("آخر تحديث"),
        } : { contract_number: t("رقم العقد"), restaurant_name: t("المطعم"), status: t("الحالة") }} />
      </>}
      {ready && section === "applications" && id && <>
        <section className={panel}>
          <h2 className="mb-4 font-display text-2xl">{data.restaurant_name} · {states[data.status]}</h2>
          <Details data={data} fields={{
            reference_number: t("رقم الطلب"), business_type: t("نوع النشاط"), city: t("المدينة"),
            address: t("العنوان"), website_url: t("الموقع"), owner_name: t("المسؤول"),
            owner_position: t("الصفة"), phone: t("الهاتف"), email: t("البريد"),
            requested_services: t("الخدمات"), estimated_tables: t("الطاولات"), notes: t("ملاحظات"),
            created_at: t("التقديم"), consented_at: t("الموافقة"),
          }} />
        </section>
        {actions[data.status]?.length > 0 && <form className={panel + " space-y-3"} onSubmit={event => form(event, body => api.patch(path + "/status", body), reviewStatus === "rejected" ? t("رفض الطلب؟") : null)}>
          <Field name="status" label={t("الإجراء")} value={reviewStatus} required onChange={event => setReviewStatus(event.target.value)}
            options={{ "": t("اختر"), ...Object.fromEntries(actions[data.status].map(key => [key, states[key]])) }} />
          <Field name="reason" label={t("السبب")} required={["rejected", "more_info_required"].includes(reviewStatus)} type="textarea" />
          <Button type="submit" loading={busy}>{t("تحديث الحالة")}</Button>
        </form>}
        <form className={panel + " space-y-3"} onSubmit={event => form(event, body => api.post(path + "/notes", body))}>
          <Field name="note" type="textarea" required label={t("ملاحظة داخلية")} />
          <Button type="submit" loading={busy}>{t("إضافة ملاحظة")}</Button>
        </form>
        {data.status === "approved" && <>
          <Link className="block font-bold text-copper-ink" to={"/admin/contracts?application=" + id}>{t("إنشاء عقد")}</Link>
          {!data.partner_id && <form className={panel + " space-y-3"} onSubmit={event => form(event, body => api.post("/admin/founding-partners", { ...body, application_id: id }))}>
            <Field name="cohort" label={t("الدفعة")} options={Object.fromEntries(cohorts.filter(item => item.enabled).map(item => [item.cohort, item.cohort]))} required />
            <Button type="submit" loading={busy}>{t("ترشيح كشريك مؤسس")}</Button>
          </form>}
        </>}
        {data.partner_id && <Link className="block text-copper-ink" to={"/admin/founding-partners/" + data.partner_id}>{title["founding-partners"]}</Link>}
        {data.contracts.map(contract => <Link key={contract.id} className="block text-copper-ink" to={"/admin/contracts/" + contract.id}>{contract.contract_number} · {states[contract.status]}</Link>)}
      </>}
      {ready && section === "contracts" && id && <>
        <section className={panel}>
          <h2 className="mb-3 font-display text-2xl">{data.contract_number} · {states[data.status]}</h2>
          <p className="mb-3 text-sm text-muted">{data.start_date} – {data.end_date}</p>
          <Details data={data.terms} fields={Object.fromEntries(Object.keys(data.terms).map(key => [key, nameOf(key)]))} />
        </section>
        {data.status === "draft" && <>
          <ContractForm data={data} templates={templates} busy={busy} submit={event => form(event, body => api.put(path, body))} />
          <Button loading={busy} onClick={() => mutate(() => api.post(path + "/generate-document", {}), t("إصدار نسخة العقد للطباعة؟"))}>{t("إصدار نسخة للطباعة")}</Button>
        </>}
        {data.documents.map(document => <div className={panel + " flex flex-wrap items-center gap-3"} key={document.id}>
          <span>{document.original_filename} · v{document.document_version}</span>
          <Button variant="secondary" onClick={() => documentAction(document, true)}>{t("معاينة وطباعة")}</Button>
          <Button variant="secondary" onClick={() => documentAction(document, false)}>{t("تنزيل")}</Button>
        </div>)}
        {["awaiting_signature", "signed_pending_verification"].includes(data.status) &&
          <form className={panel + " space-y-3"} onSubmit={upload}>
            <Field name="document" type="file" accept="application/pdf" required label={t("نسخة العقد الموقعة (PDF)")} />
            <Button type="submit" loading={busy}>{t("رفع النسخة")}</Button>
          </form>}
        {data.status === "signed_pending_verification" && <>
          <form className={panel + " grid gap-3 sm:grid-cols-2"} onSubmit={event => form(event, body => api.post(path + "/record-signature", body))}>
            <Field name="party_type" label={t("الطرف")} options={{ menupilot: "MenuPilot", restaurant: t("المطعم") }} />
            <Field name="signer_name" label={t("اسم الموقّع")} required />
            <Field name="signer_title" label={t("الصفة")} required />
            <Field name="signer_email" label={t("البريد")} type="email" />
            <Field name="signed_at" label={t("تاريخ التوقيع")} type="date" required />
            <Button type="submit" loading={busy}>{t("تسجيل التوقيع")}</Button>
          </form>
          <Button loading={busy} onClick={() => mutate(() => api.post(path + "/verify-signatures", { confirmed: true }), t("هل راجعت النسخة الورقية وتوقيع الطرفين؟"))}>{t("اعتماد التوقيع")}</Button>
        </>}
        {data.signatures.length > 0 && <Table rows={data.signatures} columns={{ document_id: t("الوثيقة"), party_type: t("الطرف"), signer_name: t("الاسم"), signed_at: t("التاريخ") }} />}
        {data.status === "active" && <Button loading={busy} variant="secondary"
          onClick={() => mutate(() => api.post(path + "/resend-invitation", {}), t("إرسال رابط دعوة جديد وإبطال الرابط السابق؟"))}>{t("إعادة إرسال دعوة المالك")}</Button>}
        {data.status === "signed" && <Button loading={busy} onClick={() => mutate(() => api.post(path + "/activate", { confirmed: true }), t("إنشاء حساب المالك وتفعيل المطعم؟"))}>{t("تفعيل المطعم")}</Button>}
        {["draft", "awaiting_signature", "signed_pending_verification", "signed", "active"].includes(data.status) &&
          <form className={panel + " space-y-3"} onSubmit={event => form(event, body => api.post(path + "/close", body), t("تأكيد إغلاق العقد؟"))}>
            <Field name="status" label={t("الإجراء")} options={data.status === "active" ? { terminated: states.terminated, expired: states.expired } : { cancelled: states.cancelled }} />
            <Field name="reason" label={t("السبب")} required />
            <Button type="submit" variant="secondary" loading={busy}>{t("إغلاق العقد")}</Button>
          </form>}
      </>}
      {ready && section === "contract-templates" && <>
        <Table rows={data} columns={{ name: t("القالب"), contract_type: t("النوع"), version: t("الإصدار") }} />
        <form className={panel + " space-y-3"} onSubmit={event => form(event, body => api.post(path, body))}>
          <p>{t("استخدم نصاً راجعته واعتمدته الإدارة قبل إصدار العقد.")}</p>
          <Field name="name" label={t("اسم القالب")} required />
          <Field name="contract_type" label={t("النوع")} options={types} />
          <Field name="version" label={t("الإصدار")} type="number" min="1" required />
          <Field name="content" label={t("نص الاتفاقية")} type="textarea" required />
          <Button type="submit" loading={busy}>{t("حفظ إصدار جديد")}</Button>
        </form>
      </>}
      {ready && section === "founding-partners" && !id && <>
        <p>{t("الشراكة تجارية وتشغيلية. لا تمنح ملكية في MenuPilot أو الكود أو العلامة التجارية.")}</p>
        <Table rows={cohorts} columns={{ cohort: t("الدفعة"), maximum_slots: t("المقاعد"), used_slots: t("المقاعد المحجوزة") }} />
        <Table rows={data.data} base={base} columns={{ restaurant_name: t("المطعم"), owner_name: t("المسؤول"), cohort: t("الدفعة"), partnership_status: t("الشراكة"), operating_status: t("التشغيل"), contract_status: t("العقد"), joined_at: t("الانضمام") }} />
      </>}
      {ready && section === "founding-partners" && id && <form key={data.updated_at} className={panel + " space-y-3"} onSubmit={event => form(event, body => {
        for (const key of ["owner", "marketing", "logo", "case_study"]) body[key + "_consent"] = body[key + "_consent"] === "on";
        return api.patch(path, body);
      })}>
        <p>{data.cohort} · {states[data.partnership_status]} · <Link className="text-copper-ink" to={"/admin/applications/" + data.application_id}>{title.applications}</Link></p>
        <Field name="operating_status" value={data.operating_status || ""} label={t("حالة التشغيل")} options={{ "": "—", planning: t("تخطيط"), onboarding: t("تهيئة"), live: t("يعمل"), paused: t("متوقف") }} />
        <Field name="benefits" value={data.benefits} label={t("المزايا")} type="textarea" />
        <Field name="obligations" value={data.obligations} label={t("الالتزامات")} type="textarea" />
        <Field name="internal_notes" value={data.internal_notes} label={t("ملاحظات داخلية")} type="textarea" />
        {Object.entries({ owner: t("موافقة المالك على الشراكة"), marketing: t("موافقة عرض الاسم"), logo: t("موافقة عرض الشعار"), case_study: t("موافقة دراسة الحالة") }).map(([key, text]) =>
          <label key={key} className="flex gap-2"><input name={key + "_consent"} type="checkbox" defaultChecked={Boolean(data[key + "_consented_at"])} />{text}</label>)}
        <Button type="submit" loading={busy}>{t("حفظ")}</Button>
        {data.partnership_status !== "closed" && <Button type="button" variant="secondary" loading={busy}
          onClick={() => mutate(() => api.patch(path, { close: true }), t("إغلاق سجل الشراكة؟"))}>{t("إغلاق الشراكة")}</Button>}
      </form>}
      {ready && section === "founding-partner-settings" && [...data, {}].map(cohort => <form key={cohort.cohort || "new"} className={panel + " space-y-3"} onSubmit={event => form(event, body => api.put(path, { ...body, enabled: body.enabled === "on" }))}>
        <Field name="cohort" value={cohort.cohort} readOnly={Boolean(cohort.cohort)} label={t("اسم الدفعة")} required />
        <Field name="maximum_slots" type="number" min="1" value={cohort.maximum_slots} label={t("المقاعد")} required />
        <Field name="default_benefits" value={cohort.default_benefits} label={t("المزايا الافتراضية")} type="textarea" />
        <label className="flex gap-2"><input type="checkbox" name="enabled" defaultChecked={cohort.enabled === undefined || Boolean(Number(cohort.enabled))} />{t("قبول الترشيحات")}</label>
        <Button type="submit" loading={busy}>{t("حفظ إعدادات الدفعة")}</Button>
      </form>)}
      {ready && id && data.events && <section><h2 className="mb-2 font-display text-xl">{t("سجل العمليات")}</h2>
        <Table rows={data.events} columns={{ event_type: t("الإجراء"), actor_id: t("المسؤول"), new_status: t("الحالة"), description: t("الملاحظة"), created_at: t("التاريخ") }} />
      </section>}
      {ready && !id && rows?.last_page > 1 && <div className="flex items-center gap-3">
        <Button variant="secondary" disabled={rows.current_page <= 1} onClick={() => pageBy(-1)}>{t("السابق")}</Button>
        <span>{rows.current_page} / {rows.last_page}</span>
        <Button variant="secondary" disabled={rows.current_page >= rows.last_page} onClick={() => pageBy(1)}>{t("التالي")}</Button>
      </div>}
    </div>
  </AdminPageShell>;
}
