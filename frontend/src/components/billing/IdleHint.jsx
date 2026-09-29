/* ==========================================================================
   IdleHint.jsx — tells staff a customer may have left the table.
   Values come from the API (hasOrders, idleMinutes, idle). Sessions without
   an order close themselves after 30 min; ones with orders are only flagged.
   ========================================================================== */
import { Hourglass } from "lucide-react";

export default function IdleHint({ session }) {
  if (!session || !session.idle) return null;
  const m = session.idleMinutes;
  const time = m >= 60 ? `${Math.floor(m / 60)} س ${m % 60 ? `${m % 60} د` : ""}` : `${m} د`;
  return (
    <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-copper/10 px-2.5 py-1.5 text-xs font-bold text-copper-ink">
      <Hourglass size={13} aria-hidden="true" />
      {session.hasOrders ? `لا نشاط منذ ${time}. تأكد أن الزبون ما زال على الطاولة.` : `لم يطلب بعد · منذ ${time}. تُغلق تلقائيًا بعد 30 د.`}
    </p>
  );
}
