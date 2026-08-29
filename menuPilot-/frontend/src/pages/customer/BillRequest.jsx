/* ==========================================================================
   BillRequest.jsx — شاشة تأكيد بعد طلب الفاتورة (FR-27) بانتظار الكاشير.
   حالة سكافولد بسيطة: تعرض حالة انتظار فقط، بدون منطق دفع (هذا من مسؤولية
   الكاشير في pages/cashier/Billing.jsx).
   ========================================================================== */
import { useSearchParams } from "react-router-dom";

export default function BillRequest() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 text-center">
      <div className="max-w-sm rounded-2xl bg-paper-2 p-8 text-ink shadow-xl">
        <span className="mb-3 block h-2.5 w-2.5 rounded-full bg-herb mx-auto animate-pulse" />
        <h1 className="mb-2 font-display text-3xl">تم طلب الفاتورة</h1>
        <p className="text-sm text-ink-soft">
          تم طلب فاتورتك للجلسة رقم #{sessionId}. تم إشعار الكاشير وسيؤكد
          دفعتك قريبًا.
        </p>
      </div>
    </div>
  );
}
