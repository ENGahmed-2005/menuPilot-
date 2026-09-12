/* ==========================================================================
   OrderTracking.jsx — تتبع حالة الطلب بشكل حي. FR-20.
   يستخدم useOrderTracking (polling كل 4 ثواني — راجع الملف لتفاصيل الاستبدال بـ WebSocket).
   ========================================================================== */
import { useSearchParams } from "react-router-dom";
import { useOrderTracking } from "../../hooks/useOrderTracking";
import { requestWaiterAssistance } from "../../api/sessions";
import { requestBill } from "../../api/billing";
import { useState } from "react";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";

const STATUS_TONE = {
  pending: "warning",
  preparing: "warning",
  ready: "good",
  served: "good",
  cancelled: "danger",
};

export default function OrderTracking() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const { orders, loading, error } = useOrderTracking(sessionId);
  const [notice, setNotice] = useState("");

  async function handleAskForHelp() {
    try {
      await requestWaiterAssistance(sessionId); // FR-41
      setNotice("تم إشعار النادل.");
    } catch (err) {
      setNotice(err.message || "تعذّر إرسال الطلب.");
    }
  }

  async function handleRequestBill() {
    try {
      await requestBill(sessionId); // FR-27
      setNotice("تم طلب الفاتورة — تم إشعار الكاشير.");
    } catch (err) {
      setNotice(err.message || "تعذّر طلب الفاتورة.");
    }
  }

  if (loading) return <Spinner label="جارِ تحميل طلبك…" />;
  if (error)
    return (
      <p role="alert" className="p-6 text-sm text-brick">
        تعذّر تحميل طلبك: {error.message}
      </p>
    );

  return (
    <div className="min-h-screen bg-paper-2 pb-10 text-ink">
      <header className="bg-ink px-5 py-6 text-paper sm:px-8">
        <h1 className="font-display text-3xl">حالة طلبك</h1>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-6 sm:px-8">
        {notice && (
          <p className="mb-4 rounded-lg bg-herb/10 px-3 py-2 text-sm text-herb">{notice}</p>
        )}

        <ul className="space-y-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 shadow-sm"
            >
              <span className="text-sm font-medium">طلب #{order.orderNumber}</span>
              <Badge tone={STATUS_TONE[order.status] || "neutral"}>{order.status}</Badge>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={handleAskForHelp}
            className="rounded-full border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
          >
            طلب مساعدة النادل
          </button>
          <button
            onClick={handleRequestBill}
            className="rounded-full bg-copper px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-copper-deep"
          >
            طلب الفاتورة
          </button>
        </div>
      </div>
    </div>
  );
}
