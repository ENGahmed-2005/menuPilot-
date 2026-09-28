/* ==========================================================================
   useSubscription — the restaurant's trial/subscription state, exactly as
   the API computed it (GET /auth/me → subscription). The UI never computes
   dates or status itself; the backend enforces the same rules on every call.
   ========================================================================== */
import { useAuth } from "../context/AuthContext";

export function useSubscription() {
  const { user } = useAuth();
  const s = user?.subscription || null;
  return {
    subscription: s,
    status: s?.status || "ACTIVE",
    phase: s?.phase || "active",
    remainingDays: s?.remaining_days ?? 0,
    trialDays: s?.trial_days ?? 14,
    // Missing state (old API / admin) never blocks the UI; the server decides.
    canOperate: s ? Boolean(s.can_operate) : true,
    restricted: Boolean(s?.restricted),
    inGrace: Boolean(s?.in_grace),
  };
}
