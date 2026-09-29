/* ==========================================================================
   SubscriptionPlanPage.jsx — choose a plan and pay by bank transfer
   (route /owner/subscription/:planId).
   1) pick plan + months → 2) transfer to Bank of Palestine with the payment
   code → 3) report it (name, date, reference, optional receipt photo) →
   4) send the invoice on WhatsApp. The platform verifies and activates.
   Prices and bank details come from GET /api/subscription.
   ========================================================================== */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Clock3, Copy, Landmark, MessageCircle, Printer, XCircle } from "lucide-react";
import { getSubscription, reportTransfer } from "../../api/subscription";
import { useAuth } from "../../context/AuthContext";
import { fetchCurrentUser } from "../../api/auth";
import { errorText } from "../../utils/errors";
import PageHeader from "../../components/dashboard/PageHeader";
import Card, { CardHeader } from "../../components/dashboard/Card";
import Alert from "../../components/ui/Alert";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import SegmentedControl from "../../components/ui/SegmentedControl";
import Skeleton from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";

const STATUS = { pending: ["بانتظار التحقق", "warning", Clock3], verified: ["مؤكدة ومفعّلة", "success", CheckCircle2], rejected: ["مرفوضة", "danger", XCircle] };
const monthsText = (n) => (n === 1 ? "شهر واحد" : n === 2 ? "شهران" : `${n} ${n <= 10 ? "أشهر" : "شهرًا"}`);
const money = (v, c) => `${Number(v || 0).toLocaleString("en-US")} ${c === "USD" ? "$" : c}`;

function CopyRow({ label, value, onCopy }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="flex items-center gap-2">
        <span dir="ltr" className="num font-bold">{value}</span>
        <button type="button" onClick={() => onCopy(value)} aria-label={`نسخ ${label}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-ink/[0.06]"><Copy size={15} aria-hidden="true" /></button>
      </dd>
    </div>
  );
}

function Invoice({ p, restaurant }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface-2 p-4 text-sm print:border-solid">
      <div className="flex items-center justify-between"><p className="font-extrabold">فاتورة اشتراك</p><span dir="ltr" className="num font-bold">{p.invoice_number}</span></div>
      <dl className="mt-3 space-y-1.5">
        <div className="flex justify-between"><dt className="text-muted">المطعم</dt><dd className="font-bold">{restaurant}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">الخطة</dt><dd className="font-bold">{p.plan_name} · {monthsText(p.months)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">المبلغ</dt><dd className="num font-extrabold">{money(p.amount, p.currency)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">طريقة الدفع</dt><dd>تحويل بنكي · {p.bank}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">رمز الدفع</dt><dd dir="ltr" className="num">{p.reference_code}</dd></div>
        {p.transfer_reference && <div className="flex justify-between"><dt className="text-muted">رقم الحوالة</dt><dd dir="ltr" className="num">{p.transfer_reference}</dd></div>}
        <div className="flex justify-between"><dt className="text-muted">الحالة</dt><dd><Badge tone={STATUS[p.status]?.[1]} icon={STATUS[p.status]?.[2]}>{STATUS[p.status]?.[0]}</Badge></dd></div>
      </dl>
    </div>
  );
}

export default function SubscriptionPlanPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(["basic", "pro", "premium"].includes(planId) ? planId : "pro");
  const [months, setMonths] = useState(1);
  const [form, setForm] = useState({ payer_name: "", transfer_date: new Date().toISOString().slice(0, 10), transfer_reference: "", note: "", proof: "" });
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(null); // payment just reported (with whatsapp_url)

  const load = () => getSubscription().then(setData).catch(setError);
  useEffect(() => { load(); }, []);

  const selected = data?.plans?.find((p) => p.id === plan);
  // Same rule as the server: 12 months → pay 12 − annual_free_months.
  const payable = months === 12 ? 12 - (data?.annual_free_months || 0) : months;
  const amount = (selected?.price || 0) * payable;
  const ils = (v) => (data?.ils_rate ? `≈ ${Math.round(v * data.ils_rate)} ₪` : "");
  const pending = data?.payments?.find((p) => p.status === "pending");
  const lastRejected = data?.payments?.[0]?.status === "rejected" ? data.payments[0] : null;
  const restaurant = user?.restaurant_name || user?.name || "مطعمي";
  const copy = (v) => navigator.clipboard?.writeText(v).then(() => toast.success("نُسخ."));

  function pickProof(e) {
    const file = e.target.files?.[0];
    if (!file) return setForm((f) => ({ ...f, proof: "" }));
    if (file.size > 5 * 1024 * 1024) { toast.error("حجم الصورة أكبر من 5MB."); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, proof: reader.result }));
    reader.readAsDataURL(file);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payment = await reportTransfer({ plan, months, ...form, proof: form.proof || undefined });
      setSent(payment);
      window.open(payment.whatsapp_url, "_blank", "noopener"); // may be blocked: the button below always works
      fetchCurrentUser().then(updateUser).catch(() => {});
      load();
    } catch (err) {
      toast.error(errorText(err, "تعذّر إرسال بيانات التحويل."));
    } finally {
      setSaving(false);
    }
  }

  if (error) return <Alert tone="danger">{errorText(error, "تعذّر تحميل بيانات الاشتراك.")}</Alert>;
  if (!data) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;

  // After reporting: the invoice + WhatsApp.
  if (sent) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <PageHeader title="استلمنا بيانات التحويل" subtitle="أرسل الفاتورة وصورة إشعار التحويل على واتساب، ونفعّل اشتراكك فور التحقق." />
        <Card className="space-y-4 p-5">
          <Invoice p={sent} restaurant={restaurant} />
          <a href={sent.whatsapp_url} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[#1f9d55] text-sm font-bold text-white">
            <MessageCircle size={18} aria-hidden="true" /> إرسال الفاتورة على واتساب <span dir="ltr">{data.whatsapp}</span>
          </a>
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> طباعة الفاتورة</Button>
            <Button variant="ghost" block onClick={() => navigate("/owner/dashboard")}>لوحة التحكم</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="الاشتراك والدفع" subtitle="اختر خطتك وادفع بتحويل بنكي إلى بنك فلسطين. نفعّل الاشتراك يدويًا بعد التحقق من التحويل." />

      {pending && (
        <Card className="space-y-4 p-5">
          <Alert tone="warning" title="دفعتك قيد التحقق">سنفعّل اشتراكك فور تأكيد وصول التحويل. إن لم ترسل الإشعار بعد، أرسله على واتساب.</Alert>
          <Invoice p={pending} restaurant={restaurant} />
          <a href={`https://wa.me/${String(data.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(`مرحبًا فريق menuPilot، بخصوص الفاتورة ${pending.invoice_number} (${restaurant}).`)}`} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[#1f9d55] text-sm font-bold text-white">
            <MessageCircle size={17} aria-hidden="true" /> تواصل معنا على واتساب
          </a>
        </Card>
      )}
      {lastRejected && !pending && <Alert tone="danger" title="رُفضت آخر دفعة">{lastRejected.rejection_reason}. يمكنك إرسال بيانات التحويل من جديد.</Alert>}

      {!pending && (
        <>
          <Card>
            <CardHeader title="1. اختر الخطة والمدة" />
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              {data.plans.map((p) => (
                <button key={p.id} type="button" onClick={() => setPlan(p.id)} aria-pressed={plan === p.id}
                  className={`rounded-2xl border p-4 text-right transition-colors ${plan === p.id ? "border-copper bg-copper/[0.07] ring-2 ring-copper/25" : "border-line bg-surface hover:border-ink/25"}`}>
                  <p className="font-extrabold">{p.name}</p>
                  <p className="num mt-1 text-2xl font-black">{money(p.price, data.currency)}<span className="text-xs font-medium text-muted"> / شهر</span></p>
                  <p className="num text-xs text-muted">{ils(p.price)} شهريًا</p>
                  {user?.plan === p.id && data.subscription?.status === "ACTIVE" && <Badge tone="success" className="mt-2">خطتك الحالية</Badge>}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
              <SegmentedControl label="المدة" value={months} onChange={setMonths} options={data.periods.map((m) => ({ value: m, label: monthsText(m) }))} />
              <p className="text-sm">المبلغ المطلوب: <b className="num text-lg">{money(amount, data.currency)}</b> <span className="num text-xs text-muted">{ils(amount)}</span>
                {months === 12 && data.annual_free_months > 0 && <span className="mr-2 rounded-full bg-copper/15 px-2 py-0.5 text-xs font-bold text-copper-ink">{data.annual_free_months} شهر مجانًا</span>}</p>
            </div>
          </Card>

          <Card>
            <CardHeader title="2. حوّل المبلغ إلى بنك فلسطين" description="اكتب رمز الدفع في ملاحظة التحويل حتى نتعرف على دفعتك بسرعة." action={<Landmark size={20} className="text-muted" aria-hidden="true" />} />
            <dl className="divide-y divide-line">
              <CopyRow label="البنك" value={data.bank.name} onCopy={copy} />
              <CopyRow label="اسم صاحب الحساب" value={data.bank.account_name} onCopy={copy} />
              <CopyRow label="رقم الحساب" value={data.bank.account_number} onCopy={copy} />
              <CopyRow label="IBAN" value={data.bank.iban} onCopy={copy} />
              <CopyRow label="الفرع" value={data.bank.branch} onCopy={copy} />
              <CopyRow label="رمز الدفع" value={data.reference_code} onCopy={copy} />
              <CopyRow label="المبلغ" value={money(amount, data.currency)} onCopy={copy} />
            </dl>
            {!data.bank_configured && (
              <div className="p-5 pt-0"><Alert tone="info">سيرسل لك فريق menuPilot رقم الحساب على واتساب <span dir="ltr">{data.whatsapp}</span> عند التواصل.</Alert></div>
            )}
          </Card>

          <Card as="form" onSubmit={submit}>
            <CardHeader title="3. أبلغنا بالتحويل" description="بعد الإرسال نفتح لك واتساب مع الفاتورة جاهزة للإرسال." />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Input label="اسم صاحب الحساب المحوِّل" required maxLength={120} value={form.payer_name} onChange={(e) => setForm((f) => ({ ...f, payer_name: e.target.value }))} />
              <Input label="تاريخ التحويل" type="date" required max={new Date().toISOString().slice(0, 10)} value={form.transfer_date} onChange={(e) => setForm((f) => ({ ...f, transfer_date: e.target.value }))} />
              <Input label="رقم الحوالة / المرجع (إن وُجد)" dir="ltr" maxLength={80} value={form.transfer_reference} onChange={(e) => setForm((f) => ({ ...f, transfer_reference: e.target.value }))} />
              <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
                صورة إشعار التحويل (اختياري)
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickProof} className="text-sm font-normal file:ml-3 file:rounded-lg file:border-0 file:bg-ink/[0.07] file:px-3 file:py-2 file:font-bold" />
              </label>
              <div className="sm:col-span-2"><Input label="ملاحظة (اختياري)" maxLength={500} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
              <p className="text-xs text-muted">لن نخصم أي مبلغ تلقائيًا. التفعيل يتم بعد التحقق من وصول التحويل.</p>
              <Button type="submit" loading={saving}><MessageCircle size={16} aria-hidden="true" /> أرسلت التحويل · {money(amount, data.currency)}</Button>
            </div>
          </Card>
        </>
      )}

      {data.payments.length > 0 && (
        <Card>
          <CardHeader title="دفعاتي" />
          <ul className="divide-y divide-line">
            {data.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span dir="ltr" className="num font-bold">{p.invoice_number}</span>
                <span>{p.plan_name} · {monthsText(p.months)}</span>
                <span className="num font-bold">{money(p.amount, p.currency)}</span>
                <Badge tone={STATUS[p.status]?.[1]} icon={STATUS[p.status]?.[2]}>{STATUS[p.status]?.[0]}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
