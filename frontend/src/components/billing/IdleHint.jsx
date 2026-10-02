/* ==========================================================================
   IdleHint.jsx — tells staff a customer may have left the table.
   Values come from the API (hasOrders, idleMinutes, idle). Sessions without
   an order close themselves after 30 min; ones with orders are only flagged.
   ========================================================================== */
import { Hourglass } from "lucide-react";
import { t } from "../../i18n";

export default function IdleHint({ session }) {
  if (!session || !session.idle) return null;
  const m = session.idleMinutes;
  const time = m >= 60 ? t("{0} س {1}", { 0: Math.floor(m / 60), 1: m % 60 ? `${m % 60} د` : "" }) : t("{0} د", { 0: m });
  return (
    <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-copper/10 px-2.5 py-1.5 text-xs font-bold text-copper-ink">
      <Hourglass size={13} aria-hidden="true" />
      {session.hasOrders ? t("لا نشاط منذ {0}. تأكد أن الزبون ما زال على الطاولة.", { 0: time }) : t("لم يطلب بعد · منذ {0}. تُغلق تلقائيًا بعد 30 د.", { 0: time })}
    </p>
  );
}
