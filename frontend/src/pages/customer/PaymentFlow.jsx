import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowLeft, Banknote, Check, CreditCard, FileImage, Loader2, Smartphone, Upload, WalletCards } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { getSession, updateCustomer } from "../../api/sessions";
import { getPaymentOptions, submitPayment } from "../../api/payments";
import Spinner from "../../components/ui/Spinner";

const METHODS = [
  { id: "bank", icon: CreditCard, title: "تحويل بنكي", text: "حوّل المبلغ إلى حساب المطعم ثم أرسل البيانات." },
  { id: "wallet", icon: WalletCards, title: "محفظة إلكترونية", text: "حوّل عبر المحفظة التي يعتمدها المطعم." },
  { id: "cash", icon: Banknote, title: "كاش بمساعدة النادل", text: "ادفع للنادل وسيؤكد استلام المبلغ." },
];

export default function PaymentFlow() {
  const { tableCode } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const navigate = useNavigate();
  const { items, total } = useCart();
  const [step, setStep] = useState(1);
  const [session, setSession] = useState(null);
  const [options, setOptions] = useState(null);
  const [method, setMethod] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", payerName: "", payerPhone: "" });
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) { setError("جلسة الطعام غير موجودة."); setLoading(false); return; }
    Promise.all([getSession(sessionId), getPaymentOptions(sessionId)]).then(([s, paymentOptions]) => {
      setSession(s); setOptions(paymentOptions);
      setForm({ name: s?.customer_name || "", phone: s?.customer_phone || "", payerName: s?.customer_name || "", payerPhone: s?.customer_phone || "" });
    }).catch((err) => setError(err.message || "تعذر تحميل بيانات الدفع.")).finally(() => setLoading(false));
  }, [sessionId]);

  const enabledMethods = useMemo(() => METHODS.filter((item) => options?.[item.id]?.enabled), [options]);
  const selectedOption = method ? options?.[method] : null;
  const menuPath = `/t/${tableCode}/menu${sessionId ? `?session=${encodeURIComponent(sessionId)}` : ""}`;
  const cartPath = `/t/${tableCode}/cart${sessionId ? `?session=${encodeURIComponent(sessionId)}` : ""}`;

  function goBack() {
    setError("");
    if (step === 1) navigate(cartPath);
    else setStep((value) => value - 1);
  }

  async function saveCustomer() {
    if (form.name.trim().length < 2 || form.phone.trim().length < 7) { setError("أدخل الاسم الكامل ورقم الجوال بشكل صحيح."); return; }
    setSaving(true); setError("");
    try { const updated = await updateCustomer(sessionId, { name: form.name.trim(), phone: form.phone.trim() }); setSession(updated); setForm((current) => ({ ...current, payerName: current.payerName || updated.customer_name, payerPhone: current.payerPhone || updated.customer_phone })); setStep(2); }
    catch (err) { setError(err.message || "تعذر حفظ بيانات العميل."); }
    finally { setSaving(false); }
  }

  function chooseMethod(id) { setMethod(id); setError(""); setStep(3); }

  async function handleSubmit() {
    if (!method) return;
    if (form.payerName.trim().length < 2 || form.payerPhone.trim().length < 7) { setError("أدخل اسم صاحب التحويل ورقم الجوال."); return; }
    setSaving(true); setError("");
    try {
      await submitPayment(sessionId, {
        items: items.map((item) => ({ menuItemId: item.menuItemId, quantity: item.quantity, note: item.note || "" })),
        method, provider: selectedOption?.name || "", payer_name: form.payerName.trim(), payer_phone: form.payerPhone.trim(), proof,
      });
      navigate(`/order-tracking?session=${encodeURIComponent(sessionId)}`, { replace: true });
    } catch (err) { setError(err.message || "تعذر إرسال الطلب للتحقق."); }
    finally { setSaving(false); }
  }

  if (loading) return <Spinner label="جارِ تجهيز خطوات الدفع…" />;
  if (error && !session) return <div dir="rtl" className="grid min-h-screen place-items-center bg-paper-2 px-5"><div className="max-w-md rounded-3xl bg-paper p-7 text-center shadow-lg"><p className="font-bold text-brick">{error}</p><button onClick={() => navigate(menuPath)} className="mt-5 rounded-2xl bg-ink px-5 py-3 text-sm font-bold text-paper">العودة للقائمة</button></div></div>;

  return <main dir="rtl" className="min-h-screen bg-paper-2 pb-10 text-ink">
    <header className="bg-ink text-paper"><div className="mx-auto max-w-2xl px-5 py-5 sm:px-8"><div className="flex items-center gap-3"><button onClick={goBack} aria-label="رجوع" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-paper/10 bg-paper/5 hover:bg-paper/10"><ArrowRight size={19}/></button><div><p className="text-xs text-paper/45">إتمام الطلب</p><h1 className="text-2xl font-black">الدفع وإرسال الطلب</h1></div></div><div className="mt-5 grid grid-cols-3 gap-2">{["بياناتك","طريقة الدفع","التأكيد"].map((label,index) => <div key={label} className={`rounded-full px-3 py-2 text-center text-xs font-bold ${step === index + 1 ? "bg-copper text-ink" : step > index + 1 ? "bg-herb text-paper" : "bg-paper/10 text-paper/45"}`}>{step > index + 1 ? <Check className="mx-auto" size={14}/> : label}</div>)}</div></div></header>

    <div className="mx-auto max-w-2xl px-5 py-6 sm:px-8">
      {error && <div role="alert" className="mb-5 rounded-2xl border border-brick/15 bg-brick/10 px-4 py-3 text-sm font-bold leading-6 text-brick">{error}</div>}
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-ink/10 bg-paper px-4 py-3"><span className="text-sm text-ink-soft">إجمالي الطلب</span><strong className="text-xl text-copper-deep">{total.toFixed(2)} ₪</strong></div>

      {step === 1 && <section className="rounded-[2rem] border border-ink/10 bg-paper p-6 shadow-sm sm:p-8"><h2 className="text-2xl font-black">بيانات العميل</h2><p className="mt-2 text-sm leading-6 text-ink-soft">نتأكد من بياناتك قبل إرسال الطلب للمطعم.</p><div className="mt-6 space-y-4"><div><label className="mb-2 block text-sm font-bold">الاسم الكامل</label><input className="w-full rounded-2xl border border-ink/10 bg-paper-2 px-4 py-3.5 outline-none focus:border-copper" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: أحمد محمد" /></div><div><label className="mb-2 block text-sm font-bold">رقم الجوال</label><input className="w-full rounded-2xl border border-ink/10 bg-paper-2 px-4 py-3.5 outline-none focus:border-copper" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" placeholder="059…" /></div></div><button onClick={saveCustomer} disabled={saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-sm font-black text-paper disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={18}/> : <ArrowLeft size={18}/>}متابعة إلى الدفع</button></section>}

      {step === 2 && <section className="rounded-[2rem] border border-ink/10 bg-paper p-6 shadow-sm sm:p-8"><h2 className="text-2xl font-black">اختر طريقة الدفع</h2><p className="mt-2 text-sm leading-6 text-ink-soft">سيتم تأكيد الطلب وإرساله للمطبخ بعد التحقق من الدفع.</p><div className="mt-6 space-y-3">{enabledMethods.map(({ id, icon: Icon, title, text }) => <button key={id} onClick={() => chooseMethod(id)} className="flex w-full items-center gap-4 rounded-2xl border border-ink/10 bg-paper-2 p-4 text-right transition hover:border-copper hover:shadow-md"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-copper/10 text-copper"><Icon size={21}/></span><span className="min-w-0 flex-1"><b className="block">{title}</b><span className="mt-1 block text-xs leading-5 text-ink-soft">{text}</span></span><ArrowLeft size={18} className="text-ink-soft/40"/></button>)}{enabledMethods.length === 1 && <p className="rounded-xl bg-copper/10 p-3 text-xs text-ink-soft">المطعم لم يفعّل طرق دفع إلكترونية بعد، لذلك الدفع النقدي هو المتاح حاليًا.</p>}</div></section>}

      {step === 3 && selectedOption && <section className="rounded-[2rem] border border-ink/10 bg-paper p-6 shadow-sm sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold text-copper">طريقة الدفع</p><h2 className="mt-1 text-2xl font-black">{selectedOption.name}</h2></div><button onClick={() => setStep(2)} className="rounded-xl border border-ink/10 px-3 py-2 text-xs font-bold">تغيير</button></div>
        {method === "cash" ? <div className="mt-6 rounded-2xl border border-copper/20 bg-copper/5 p-5"><div className="flex items-start gap-3"><Banknote className="mt-0.5 text-copper"/><div><h3 className="font-black">الدفع كاش</h3><p className="mt-1 text-sm leading-7 text-ink-soft">اطلب مساعدة النادل، ادفع له المبلغ، ثم سيؤكد استلام المبلغ ليتم إرسال طلبك للمطبخ.</p></div></div></div> : <><div className="mt-6 rounded-2xl border border-ink/10 bg-paper-2 p-5"><p className="text-xs font-bold text-ink-soft/60">بيانات التحويل</p><div className="mt-3 grid gap-3 text-sm"><div className="flex justify-between gap-4"><span className="text-ink-soft">الجهة</span><b>{selectedOption.name}</b></div><div className="flex justify-between gap-4"><span className="text-ink-soft">اسم الحساب</span><b>{selectedOption.account_name || "غير مضبوط"}</b></div><div className="flex justify-between gap-4"><span className="text-ink-soft">رقم الحساب / الجوال</span><b dir="ltr">{selectedOption.account_number || "غير مضبوط"}</b></div></div>{selectedOption.qr_url && <img src={selectedOption.qr_url} alt="QR الدفع" className="mx-auto mt-5 h-44 w-44 rounded-2xl bg-white object-contain p-2"/>}</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-bold">اسم صاحب التحويل</label><input className="w-full rounded-2xl border border-ink/10 bg-paper-2 px-4 py-3.5 outline-none focus:border-copper" value={form.payerName} onChange={(e) => setForm({ ...form, payerName: e.target.value })}/></div><div><label className="mb-2 block text-sm font-bold">رقم الجوال</label><input className="w-full rounded-2xl border border-ink/10 bg-paper-2 px-4 py-3.5 outline-none focus:border-copper" value={form.payerPhone} onChange={(e) => setForm({ ...form, payerPhone: e.target.value })} inputMode="tel"/></div></div><label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-ink/20 bg-paper-2 p-4"><Upload size={19} className="text-copper"/><span className="min-w-0 flex-1"><b className="block text-sm">إرفاق إشعار التحويل <span className="font-normal text-ink-soft/60">(اختياري)</span></b><span className="mt-1 block truncate text-xs text-ink-soft/60">{proof ? proof.name : "صورة أو PDF حتى 5MB"}</span></span><input type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => setProof(e.target.files?.[0] || null)}/><FileImage size={18} className="text-ink-soft/40"/></label></>}
        <button onClick={handleSubmit} disabled={saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-copper py-4 text-sm font-black text-ink shadow-lg shadow-copper/10 disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={18}/> : <Check size={18}/>}إرسال للتحقق</button>
      </section>}
    </div>
  </main>;
}
