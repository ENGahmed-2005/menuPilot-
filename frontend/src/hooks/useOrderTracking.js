import { useEffect, useState } from "react";
import { getSessionOrders } from "../api/orders";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
// "polling" avoids long-lived SSE connections, which block the single-worker
// `php artisan serve` on Windows. Production keeps the default "sse".
const POLLING = import.meta.env.VITE_REALTIME_MODE === "polling";
const POLL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 3000;

export function useOrderTracking(sessionId) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) { setOrders([]); setError(new Error("جلسة الطعام غير موجودة.")); setLoading(false); return undefined; }
    let active = true;
    const load = () => getSessionOrders(sessionId).then((data) => { if (active) { setOrders(data ?? []); setError(null); setLoading(false); } }).catch((err) => { if (active) { setError(err); setLoading(false); } });
    load();

    if (POLLING) {
      const timer = setInterval(load, POLL_MS);
      return () => { active = false; clearInterval(timer); };
    }

    const source = new EventSource(`${BASE_URL}/public/sessions/${sessionId}/orders/stream`);
    source.addEventListener("orders", (event) => { if (!active) return; try { setOrders(JSON.parse(event.data) || []); setError(null); setLoading(false); } catch { /* ignore */ } });
    source.onerror = () => { /* EventSource reconnects automatically. Keep the last known state visible. */ };
    return () => { active = false; source.close(); };
  }, [sessionId]);

  return { orders, loading, error };
}
