import { CheckCircle2, Clock3, ReceiptText, Utensils } from "lucide-react";
import { useSearchParams } from "react-router-dom";

export default function BillRequest() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");

  return (
    <main dir="rtl" className="min-h-screen bg-ink px-5 py-8 text-paper sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
        <section className="w-full overflow-hidden rounded-[2rem] bg-paper-2 text-ink shadow-2xl">
          <div className="relative overflow-hidden bg-ink px-6 pb-8 pt-7 text-paper sm:px-8">
            <div className="absolute -left-10 -top-12 h-36 w-36 rounded-full bg-copper/20 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-copper text-ink"><Utensils size={20} /></div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.18em] text-copper">MENUPILOT</p>
                <p className="text-xs text-paper/50">إدارة جلسة الطعام</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-8 text-center sm:px-8 sm:py-10">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-herb/10 text-herb">
              <CheckCircle2 size={42} strokeWidth={1.8} />
            </div>
            <h1 className="mt-6 font-display text-4xl">تم طلب الفاتورة</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-ink-soft">
              تم إرسال طلب الفاتورة إلى الكاشير بنجاح. سيقوم الفريق بمراجعة الحساب ومتابعة الدفع معك.
            </p>

            <div className="mt-7 rounded-2xl border border-ink/10 bg-white p-4 text-right">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-copper/10 text-copper"><ReceiptText size={18} /></div>
                <div>
                  <p className="text-xs text-ink-soft/60">رقم جلسة الطعام</p>
                  <p className="mt-0.5 font-bold">#{sessionId}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-copper/10 px-4 py-3 text-xs font-semibold text-copper-deep">
              <Clock3 size={16} /> بانتظار تأكيد الكاشير للدفع
            </div>

            <p className="mt-6 text-xs leading-5 text-ink-soft/50">
              لا تحتاج إلى تحديث الصفحة. سيهتم فريق المطعم بالخطوات التالية.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
