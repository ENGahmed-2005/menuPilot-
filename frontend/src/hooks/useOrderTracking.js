/* ============================================================================
   useOrderTracking.js — تتبع حي لحالة طلبات جلسة الزبون
   يغطي: FR-20 (تحديث تلقائي بدون إعادة تحميل يدوية)
   ============================================================================ */
import { useEffect, useState } from "react";
import { getSessionOrders } from "../api/orders";

const POLL_INTERVAL_MS = 4000;

/**
 * @param {string|null} sessionId
 * @returns {{ orders: array, loading: boolean, error: Error|null }}
 */
export function useOrderTracking(sessionId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setOrders([]);
      setError(new Error("جلسة الطعام غير موجودة."));
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

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

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionId]);

  return { orders, loading, error };
}
