/* ==========================================================================
   SubscriptionPlanPage.jsx — choose a plan and pay by bank transfer
   (route /owner/subscription/:planId).
   1) pick plan + add-ons + months → 2) transfer to Bank of Palestine with the payment
   code → 3) report it (name, date, reference, optional receipt photo) →
   4) send the invoice on WhatsApp. The platform verifies and activates.
   Prices, add-ons and bank details come from GET /api/subscription; the
   server prices the payment itself (the total here is for display).
   ========================================================================== */
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Bike, Check, CheckCircle2, Clock3, Copy, Landmark, Lock, MessageCircle, Palette, Printer, Sparkles, XCircle } from "lucide-react";
import { ADDON_ORDER, DEFAULT_PLAN, MAIN_PLANS, PLAN_ORDER, SUBSCRIPTION_ADDONS, SUBSCRIPTION_PLANS, addonFits, addonIncluded, addonsForPlan, hasPlanFeature, normalizePlan, subscriptionOf } from "../../config/subscriptions";
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
import { t } from "../../i18n";

const STATUS = { pending: [t("بانتظار التحقق"), "warning", Clock3], verified: [t("مؤكدة ومفعّلة"), "success", CheckCircle2], rejected: [t("مرفوضة"), "danger", XCircle] };
const monthsText = (n) => (n === 1 ? t("شهر واحد") : n === 2 ? t("شهران") : `${n} ${n <= 10 ? t("أشهر") : t("شهرًا")}`);
const money = (v, c) => `${Number(v || 0).toLocaleString("en-US")} ${c === "USD" ? "$" : c}`;
const ADDON_ICONS = { delivery: Bike, brand_plus: Palette };

/**
 * First selection: the plan in the URL (premium → pro + both add-ons), the
 * add-on a locked page asked for (FeatureProtectedRoute / "أضف" links), and
 * otherwise the restaurant's current add-ons so a renewal is one click.
 */
function initialChoice(planId, user, state) {
  const current = subscriptionOf(user);
  const fromRoute = normalizePlan(planId === "current" ? current.plan : planId);
  let plan = PLAN_ORDER.includes(fromRoute.plan) ? fromRoute.plan : PLAN_ORDER.includes(current.plan) ? current.plan : DEFAULT_PLAN;
  let addons = fromRoute.addons.length ? fromRoute.addons : plan === current.plan ? current.addons : [];
  const wanted = state?.requiredAddon;
  const from = plan;
  if (wanted && SUBSCRIPTION_ADDONS[wanted] && !addonIncluded(wanted, plan)) {
    if (!addonFits(wanted, plan)) plan = SUBSCRIPTION_ADDONS[wanted].plans.at(-1);
    addons = [...addons, wanted];
  } else if (state?.requiredFeature && !hasPlanFeature(plan, state.requiredFeature)) {
    // The cheapest main plan with the feature (tables → Basic, reports → Pro).
    plan = MAIN_PLANS.find((p) => hasPlanFeature(p, state.requiredFeature)) || plan;
  }
  return { plan, addons: addonsForPlan(from, plan, addons) };
}

function CopyRow({ label, value, onCopy }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="flex items-center gap-2">
        <span dir="ltr" className="num font-bold">{value}</span>
        <button type="button" onClick={() => onCopy(value)} aria-label={t("نسخ {0}", { 0: label })} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-ink/[0.06]"><Copy size={15} aria-hidden="true" /></button>
      </dd>
    </div>
  );
}

function Invoice({ p, restaurant }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface-2 p-4 text-sm print:border-solid">
      <div className="flex items-center justify-between"><p className="font-extrabold">{t("فاتورة اشتراك")}</p><span dir="ltr" className="num font-bold">{p.invoice_number}</span></div>
      <dl className="mt-3 space-y-1.5">
        <div className="flex justify-between"><dt className="text-muted">{t("المطعم")}</dt><dd className="font-bold">{restaurant}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted">{t("الخطة")}</dt><dd className="text-left font-bold">{p.plan_label || p.plan_name} · {monthsText(p.months)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">{t("المبلغ")}</dt><dd className="num font-extrabold">{money(p.amount, p.currency)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">{t("طريقة الدفع")}</dt><dd>{t("تحويل بنكي ·")} {p.bank}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">{t("رمز الدفع")}</dt><dd dir="ltr" className="num">{p.reference_code}</dd></div>
        {p.transfer_reference && <div className="flex justify-between"><dt className="text-muted">{t("رقم الحوالة")}</dt><dd dir="ltr" className="num">{p.transfer_reference}</dd></div>}
        <div className="flex justify-between"><dt className="text-muted">{t("الحالة")}</dt><dd><Badge tone={STATUS[p.status]?.[1]} icon={STATUS[p.status]?.[2]}>{STATUS[p.status]?.[0]}</Badge></dd></div>
      </dl>
    </div>
  );
}

export default function SubscriptionPlanPage() {
  const { planId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [choice] = useState(() => initialChoice(planId, user, location.state));
  const [plan, setPlanId] = useState(choice.plan);
  const [addons, setAddons] = useState(choice.addons);
  const [months, setMonths] = useState(1);
  const [form, setForm] = useState({ payer_name: "", transfer_date: new Date().toISOString().slice(0, 10), transfer_reference: "", note: "", proof: "" });
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(null); // payment just reported (with whatsapp_url)

  const load = () => getSubscription().then(setData).catch(setError);
  useEffect(() => { load(); }, []);

  const selected = data?.plans?.find((p) => p.id === plan);
  // Older API without add-ons: fall back to the local catalogue.
  const catalogue = data?.addons ?? ADDON_ORDER.map((id) => SUBSCRIPTION_ADDONS[id]);
  const chosen = catalogue.filter((a) => addons.includes(a.id));
  // Same rule as the server: (plan + add-ons) per month; 12 months → pay 12 − annual_free_months.
  const monthly = (selected?.price || 0) + chosen.reduce((sum, a) => sum + Number(a.price || 0), 0);
  const payable = months === 12 ? 12 - (data?.annual_free_months || 0) : months;
  const amount = monthly * payable;
  const live = data?.subscription?.status === "ACTIVE" ? data.subscription : null;
  const planName = (id) => data?.plans?.find((p) => p.id === id)?.name || SUBSCRIPTION_PLANS[id]?.name || id;

  // Switching plan drops the add-ons it can't take (they show as locked) and
  // keeps what the old plan included (delivery only → Basic + delivery).
  function setPlan(id) {
    setPlanId(id);
    setAddons((list) => addonsForPlan(plan, id, list));
  }
  // Picking an add-on the plan can't take moves to the plan that can.
  function toggleAddon(addon) {
    if (addonIncluded(addon.id, plan)) return;
    if (addons.includes(addon.id)) return setAddons((list) => list.filter((a) => a !== addon.id));
    const target = addon.plans.includes(plan) ? plan : addon.plans.at(-1);
    setPlanId(target);
    setAddons((list) => addonsForPlan(plan, target, [...list, addon.id]));
  }
  const ils = (v) => (data?.ils_rate ? `≈ ${Math.round(v * data.ils_rate)} ₪` : "");
  const pending = data?.payments?.find((p) => p.status === "pending");
  const lastRejected = data?.payments?.[0]?.status === "rejected" ? data.payments[0] : null;
  const restaurant = user?.restaurant_name || user?.name || t("مطعمي");
  const copy = (v) => navigator.clipboard?.writeText(v).then(() => toast.success(t("نُسخ.")));

  function pickProof(e) {
    const file = e.target.files?.[0];
    if (!file) return setForm((f) => ({ ...f, proof: "" }));
    if (file.size > 5 * 1024 * 1024) { toast.error(t("حجم الصورة أكبر من 5MB.")); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, proof: reader.result }));
    reader.readAsDataURL(file);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payment = await reportTransfer({ plan, addons, months, ...form, proof: form.proof || undefined });
      setSent(payment);
      window.open(payment.whatsapp_url, "_blank", "noopener"); // may be blocked: the button below always works
      fetchCurrentUser().then(updateUser).catch(() => {});
      load();
    } catch (err) {
      toast.error(errorText(err, t("تعذّر إرسال بيانات التحويل.")));
    } finally {
      setSaving(false);
    }
  }

  if (error) return <Alert tone="danger">{errorText(error, t("تعذّر تحميل بيانات الاشتراك."))}</Alert>;
  if (!data) return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;

  // After reporting: the invoice + WhatsApp.
  if (sent) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <PageHeader title={t("استلمنا بيانات التحويل")} subtitle={t("أرسل الفاتورة وصورة إشعار التحويل على واتساب، ونفعّل اشتراكك فور التحقق.")} />
        <Card className="space-y-4 p-5">
          <Invoice p={sent} restaurant={restaurant} />
          <a href={sent.whatsapp_url} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[#1f9d55] text-sm font-bold text-white">
            <MessageCircle size={18} aria-hidden="true" /> {t("إرسال الفاتورة على واتساب")} <span dir="ltr">{data.whatsapp}</span>
          </a>
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> {t("طباعة الفاتورة")}</Button>
            <Button variant="ghost" block onClick={() => navigate("/owner/dashboard")}>{t("لوحة التحكم")}</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("الاشتراك والدفع")} subtitle={t("اختر خطتك وادفع بتحويل بنكي إلى بنك فلسطين. نفعّل الاشتراك يدويًا بعد التحقق من التحويل.")} />

      {pending && (
        <Card className="space-y-4 p-5">
          <Alert tone="warning" title={t("دفعتك قيد التحقق")}>{t("سنفعّل اشتراكك فور تأكيد وصول التحويل. إن لم ترسل الإشعار بعد، أرسله على واتساب.")}</Alert>
          <Invoice p={pending} restaurant={restaurant} />
          <a href={`https://wa.me/${String(data.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(t("مرحبًا فريق menuPilot، بخصوص الفاتورة {0} ({1}).", { 0: pending.invoice_number, 1: restaurant }))}`} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[#1f9d55] text-sm font-bold text-white">
            <MessageCircle size={17} aria-hidden="true" /> {t("تواصل معنا على واتساب")}
          </a>
        </Card>
      )}
      {lastRejected && !pending && <Alert tone="danger" title={t("رُفضت آخر دفعة")}>{lastRejected.rejection_reason}{t(". يمكنك إرسال بيانات التحويل من جديد.")}</Alert>}

      {!pending && (
        <>
          <Card>
            <CardHeader title={t("1. اختر الخطة والإضافات والمدة")} description={t("ادفع على قدر احتياجك: خطة واحدة، وأضف إليها ما يستخدمه مطعمك فقط.")} />
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              {data.plans.map((p) => (
                <button key={p.id} type="button" onClick={() => setPlan(p.id)} aria-pressed={plan === p.id}
                  className={`rounded-2xl border p-4 text-right transition-colors ${plan === p.id ? "border-copper bg-copper/[0.07] ring-2 ring-copper/25" : "border-line bg-surface hover:border-ink/25"}`}>
                  <p className="font-extrabold">{p.name}</p>
                  <p className="num mt-1 text-2xl font-black">{money(p.price, data.currency)}<span className="text-xs font-medium text-muted"> {t("/ شهر")}</span></p>
                  <p className="num text-xs text-muted">{ils(p.price)} {t("شهريًا")}</p>
                  {SUBSCRIPTION_PLANS[p.id]?.description && <p className="mt-2 text-xs leading-5 text-muted">{SUBSCRIPTION_PLANS[p.id].description}</p>}
                  {live?.plan === p.id && <Badge tone="success" className="mt-2">{t("خطتك الحالية")}</Badge>}
                </button>
              ))}
            </div>
            <fieldset className="border-t border-line p-5">
              <legend className="text-sm font-extrabold">{t("الإضافات")} <span className="font-medium text-muted">{t("اختيارية، وتُضاف إلى السعر الشهري")}</span></legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {catalogue.map((a) => {
                  const included = addonIncluded(a.id, plan);
                  const on = included || addons.includes(a.id);
                  const fits = a.plans.includes(plan) || included;
                  const Icon = ADDON_ICONS[a.id] || Sparkles;
                  return (
                    <button key={a.id} type="button" onClick={() => toggleAddon(a)} aria-pressed={on} disabled={included}
                      className={`flex gap-3 rounded-2xl border p-4 text-right transition-colors disabled:cursor-default ${on ? "border-copper bg-copper/[0.07] ring-2 ring-copper/25" : "border-line bg-surface hover:border-ink/25"}`}>
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${on ? "bg-copper text-ink" : "bg-ink/[0.06] text-muted"}`}>
                        {on ? <Check size={17} aria-hidden="true" /> : <Icon size={17} aria-hidden="true" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-2">
                          <b className="text-sm">{a.name}</b>
                          {included
                            ? <span className="text-xs font-bold text-copper-ink">{t("مشمولة في «")}{planName(plan)}»</span>
                            : <span className="num text-sm font-black">+{money(a.price, data.currency)}<span className="text-xs font-medium text-muted"> {t("/ شهر")}</span></span>}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted">{a.description}</span>
                        {!fits && <span className="mt-2 flex items-center gap-1 text-xs font-bold text-copper-ink"><Lock size={12} aria-hidden="true" /> {t("تحتاج الخطة")} {a.plans.map(planName).join(t(" أو "))}{t("، واختيارها ينقلك إليها")}</span>}
                        {live?.addons?.includes(a.id) && <Badge tone="success" className="mt-2">{t("مفعّلة الآن")}</Badge>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
              <SegmentedControl label={t("المدة")} value={months} onChange={setMonths} options={data.periods.map((m) => ({ value: m, label: monthsText(m) }))} />
              <div className="text-left">
                <p className="text-sm">{t("المبلغ المطلوب:")} <b className="num text-lg">{money(amount, data.currency)}</b> <span className="num text-xs text-muted">{ils(amount)}</span>
                  {months === 12 && data.annual_free_months > 0 && <span className="mr-2 rounded-full bg-copper/15 px-2 py-0.5 text-xs font-bold text-copper-ink">{data.annual_free_months} {t("شهر مجانًا")}</span>}</p>
                <p className="num mt-1 text-xs text-muted">
                  {[`${selected?.name || planName(plan)} ${money(selected?.price, data.currency)}`, ...chosen.map((a) => `${a.name} ${money(a.price, data.currency)}`)].join(" + ")} = {money(monthly, data.currency)} {t("شهريًا")}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title={t("2. حوّل المبلغ إلى بنك فلسطين")} description={t("اكتب رمز الدفع في ملاحظة التحويل حتى نتعرف على دفعتك بسرعة.")} action={<Landmark size={20} className="text-muted" aria-hidden="true" />} />
            <dl className="divide-y divide-line">
              <CopyRow label={t("البنك")} value={data.bank.name} onCopy={copy} />
              <CopyRow label={t("اسم صاحب الحساب")} value={data.bank.account_name} onCopy={copy} />
              <CopyRow label={t("رقم الحساب")} value={data.bank.account_number} onCopy={copy} />
              <CopyRow label="IBAN" value={data.bank.iban} onCopy={copy} />
              <CopyRow label={t("الفرع")} value={data.bank.branch} onCopy={copy} />
              <CopyRow label={t("رمز الدفع")} value={data.reference_code} onCopy={copy} />
              <CopyRow label={t("المبلغ")} value={money(amount, data.currency)} onCopy={copy} />
            </dl>
            {!data.bank_configured && (
              <div className="p-5 pt-0"><Alert tone="info">{t("سيرسل لك فريق menuPilot رقم الحساب على واتساب")} <span dir="ltr">{data.whatsapp}</span> {t("عند التواصل.")}</Alert></div>
            )}
          </Card>

          <Card as="form" onSubmit={submit}>
            <CardHeader title={t("3. أبلغنا بالتحويل")} description={t("بعد الإرسال نفتح لك واتساب مع الفاتورة جاهزة للإرسال.")} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Input label={t("اسم صاحب الحساب المحوِّل")} required maxLength={120} value={form.payer_name} onChange={(e) => setForm((f) => ({ ...f, payer_name: e.target.value }))} />
              <Input label={t("تاريخ التحويل")} type="date" required max={new Date().toISOString().slice(0, 10)} value={form.transfer_date} onChange={(e) => setForm((f) => ({ ...f, transfer_date: e.target.value }))} />
              <Input label={t("رقم الحوالة / المرجع (إن وُجد)")} dir="ltr" maxLength={80} value={form.transfer_reference} onChange={(e) => setForm((f) => ({ ...f, transfer_reference: e.target.value }))} />
              <label className="flex flex-col gap-1.5 text-sm font-bold text-ink">
                {t("صورة إشعار التحويل (اختياري)")}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickProof} className="text-sm font-normal file:ml-3 file:rounded-lg file:border-0 file:bg-ink/[0.07] file:px-3 file:py-2 file:font-bold" />
              </label>
              <div className="sm:col-span-2"><Input label={t("ملاحظة (اختياري)")} maxLength={500} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
              <p className="text-xs text-muted">{t("لن نخصم أي مبلغ تلقائيًا. التفعيل يتم بعد التحقق من وصول التحويل.")}</p>
              <Button type="submit" loading={saving}><MessageCircle size={16} aria-hidden="true" /> {t("أرسلت التحويل ·")} {money(amount, data.currency)}</Button>
            </div>
          </Card>
        </>
      )}

      {data.payments.length > 0 && (
        <Card>
          <CardHeader title={t("دفعاتي")} />
          <ul className="divide-y divide-line">
            {data.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span dir="ltr" className="num font-bold">{p.invoice_number}</span>
                <span>{p.plan_label || p.plan_name} · {monthsText(p.months)}</span>
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
