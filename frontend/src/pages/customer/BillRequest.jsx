/* ==========================================================================
   BillRequest.jsx — the customer's bill (route /bill-request?session=ID).
   Shows the real itemised bill from GET /public/sessions/{id}/bill and keeps
   it current (every 5 s): requested → payment being checked → paid → closed.
   Printable / savable as a receipt.
   ========================================================================== */
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, MessageCircle, Printer, ReceiptText, RefreshCw } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BrandLogo from "../../components/brand/Logo";
import { getCustomerBill } from "../../api/billing";
import { errorText } from "../../utils/errors";
import { money } from "../../utils/format";
import { waLink } from "../../utils/whatsapp";
import { t, dir, locale } from "../../i18n";
import { useLive, useSessionChannel } from "../../realtime";
import ItemOptions from "../../components/orders/ItemOptions";
import { withOptions } from "../../components/menu/cartLine";

const STATE = {
  closed: { icon: CheckCircle2, tone: "bg-herb/10 text-herb", title: t("تم الدفع، شكرًا لزيارتك"), note: t("أُغلقت جلسة الطاولة. نتمنى أن تكون وجبتك قد أعجبتك.") },
  paid: { icon: CheckCircle2, tone: "bg-herb/10 text-herb", title: t("تم دفع الفاتورة بالكامل"), note: t("شكرًا لك! سيُغلق الكاشير الجلسة قريبًا.") },
  payment_pending: { icon: Clock3, tone: "bg-copper/10 text-copper-ink", title: t("دفعتك قيد التأكيد"), note: t("يراجع الكاشير دفعتك الآن، وتتحدث هذه الصفحة تلقائيًا.") },
  bill_requested: { icon: Clock3, tone: "bg-copper/10 text-copper-ink", title: t("تم طلب الفاتورة"), note: t("أُبلغ الكاشير، وسيأتيك أحد الطاقم لإتمام الدفع.") },
  active: { icon: ReceiptText, tone: "bg-ink/5 text-ink", title: t("فاتورتك حتى الآن"), note: t("يمكنك طلب الفاتورة من صفحة تتبع الطلب عندما تنتهي.") },
};

export default function BillRequest() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session");
  const [bill, setBill] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    if (!sessionId) return;
    getCustomerBill(sessionId).then((data) => { setBill(data); setError(null); }).catch(setError);
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);
  useLive({ channel: useSessionChannel(sessionId), onSignal: load, pollMs: 5000 });

  const closed = Boolean(bill?.session?.closed_at);
  const stateKey = closed ? "closed" : bill?.lifecycle === "paid" ? "paid" : bill?.lifecycle === "payment_pending" ? "payment_pending" : bill?.session?.bill_requested ? "bill_requested" : "active";
  const state = STATE[stateKey];
  const StateIcon = state.icon;

  return (
    <main dir={dir} className="min-h-screen bg-paper-2 pb-10 text-ink print:bg-white">
      <header className="bg-navy text-paper print:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-5">
          <div><BrandLogo on="dark" height={22} /><p className="mt-1 text-xs text-paper/70">{t("فاتورة الطاولة")}</p></div>
          <button onClick={load} aria-label={t("تحديث الفاتورة")} className="grid h-10 w-10 place-items-center rounded-full bg-paper/10"><RefreshCw size={17} aria-hidden="true" /></button>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-5 pt-5">
        {!sessionId ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm">{t("رابط الفاتورة غير مكتمل. افتحها من صفحة تتبع الطلب.")}</p>
        ) : error && !bill ? (
          <div role="alert" className="rounded-2xl border border-brick/15 bg-white p-6 text-center">
            <p className="font-bold text-brick">{errorText(error, t("تعذّر تحميل الفاتورة."))}</p>
            <button onClick={load} className="mt-4 h-11 rounded-xl bg-navy px-5 text-sm font-bold text-paper">{t("حاول مرة أخرى")}</button>
          </div>
        ) : !bill ? (
          <div className="space-y-3" role="status" aria-live="polite"><span className="sr-only">{t("جارِ تحميل الفاتورة…")}</span>
            <div className="h-20 animate-pulse rounded-2xl bg-black/[0.06]" /><div className="h-72 animate-pulse rounded-2xl bg-black/[0.06]" />
          </div>
        ) : (
          <>
            {/* Where the bill is now */}
            <section role="status" aria-live="polite" className={`flex items-start gap-3 rounded-2xl p-4 print:hidden ${state.tone}`}>
              <StateIcon size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
              <div><p className="font-extrabold">{state.title}</p><p className="mt-0.5 text-sm leading-6 text-ink-soft">{state.note}</p></div>
            </section>

            {/* The receipt */}
            <section className="mt-4 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5 print:shadow-none print:ring-0">
              <div className="border-b border-dashed border-line px-5 py-4 text-center">
                <p className="text-lg font-black">{bill.restaurant || t("المطعم")}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {bill.session.table_label ? t("طاولة {0}", { 0: bill.session.table_label }) : t("طاولتك")} {t("· جلسة #")}{bill.session.id}
                  {bill.session.opened_at && ` · ${new Date(bill.session.opened_at).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`}
                </p>
              </div>

              {bill.items.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted">{t("لا توجد أصناف في الفاتورة بعد.")}</p>
              ) : (
                <ul className="divide-y divide-line px-5">
                  {bill.items.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-bold"><span className="tabular-nums text-muted">{item.quantity}×</span> {item.name}</p>
                        <ItemOptions options={item.options} />
                        {item.note && <p className="mt-0.5 text-xs text-copper-ink">{item.note}</p>}
                        <p className="mt-0.5 text-xs text-muted tabular-nums">{money(item.unit_price)} {t("للواحد")}</p>
                      </div>
                      <span className="shrink-0 font-bold tabular-nums">{money(item.total)}</span>
                    </li>
                  ))}
                </ul>
              )}

              <dl className="space-y-2 border-t border-dashed border-line bg-surface-2 px-5 py-4 text-sm">
                <div className="flex justify-between text-base"><dt className="font-extrabold">{t("الإجمالي")}</dt><dd className="font-black tabular-nums">{money(bill.total)}</dd></div>
                {bill.paid > 0 && <div className="flex justify-between text-herb"><dt>{t("المدفوع")}</dt><dd className="font-bold tabular-nums">{money(bill.paid)}</dd></div>}
                <div className="flex justify-between"><dt className="font-bold">{t("المتبقي")}</dt><dd className="font-extrabold tabular-nums">{money(bill.outstanding)}</dd></div>
              </dl>
            </section>

            <div className="mt-5 grid gap-3 print:hidden">
              {bill.restaurant_whatsapp && (
                <a href={waLink(bill.restaurant_whatsapp, [t("مرحبًا {0} 👋", { 0: bill.restaurant || "" }), t("فاتورة {0} · جلسة #{1}", { 0: bill.session.table_label ? `طاولة ${bill.session.table_label}` : "طاولتي", 1: bill.session.id }), ...bill.items.map((i) => `• ${i.quantity}× ${withOptions(i)} — ${money(i.total)}`), t("الإجمالي: {0}", { 0: money(bill.total) }), t("المتبقي: {0}", { 0: money(bill.outstanding) })].join("\n"))}
                  target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#1f9d55] text-sm font-bold text-white">
                  <MessageCircle size={17} aria-hidden="true" /> {t("تأكيد الفاتورة على واتساب")}
                </a>
              )}
              <button onClick={() => window.print()} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold ring-1 ring-black/10">
                <Printer size={17} aria-hidden="true" /> {t("حفظ أو طباعة الفاتورة")}
              </button>
              {!closed && (
                <button onClick={() => navigate(`/order-tracking?session=${encodeURIComponent(sessionId)}`)} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-navy text-sm font-bold text-paper">
                  <ArrowRight size={17} aria-hidden="true" /> {t("العودة لتتبع الطلب")}
                </button>
              )}
            </div>
            <p className="mt-4 text-center text-xs text-muted print:hidden">{t("تتحدث الفاتورة تلقائيًا، ولا تحتاج إلى تحديث الصفحة.")}</p>
          </>
        )}
      </div>
    </main>
  );
}
