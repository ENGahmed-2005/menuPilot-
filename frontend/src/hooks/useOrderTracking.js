/* ==========================================================================
   useOrderTracking.js — تتبع حي لحالة طلبات جلسة الزبون
   يغطي: FR-20 (تحديث تلقائي بدون إعادة تحميل يدوية)
   --------------------------------------------------------------------------
   مبني بـ polling بسيط (setInterval) كخيار افتراضي يعمل مع أي backend REST
   عادي. لو الفريق فعّل WebSocket لاحقًا (كما يقترح القسم 1.9.3 من الـ SRS)،
   استبدل جسم useEffect هنا بالاشتراك بقناة socket بدل الـ polling، دون ما
   تغيّر شكل القيمة المُرجعة — باقي التطبيق ما رح يتأثر.
   ========================================================================== */
import { useEffect, useState } from "react";
import { getSessionOrders } from "../api/orders";

const POLL_INTERVAL_MS = 4000;

/**
 * @param {string} sessionId
 * @returns {{ orders: array, loading: boolean, error: Error|null }}
 */
export function useOrderTracking(sessionId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    async function poll() {
      try {
        const data = await getSessionOrders(sessionId);
        if (!cancelled) {
          setOrders(data ?? []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    poll(); // أول جلب فوري، بدون انتظار أول interval
    const id = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionId]);

  return { orders, loading, error };
}
