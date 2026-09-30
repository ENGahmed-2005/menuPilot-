/* ==========================================================================
   OwnerStatusControl.jsx — owner-only override of a delivery order's status
   (forward or back, or cancel with a reason the customer sees). The API
   enforces the rules: owner only, transfers verified before completion,
   completed/rejected orders are final. Every change is audited.
   ========================================================================== */
import { useState } from "react";
import { overrideOutsideStatus } from "../../api/outsideOrders";
import { useAuth } from "../../context/AuthContext";
import { errorText } from "../../utils/errors";
import { useToast } from "../ui/Toast";

const OPTIONS = [["preparing", "قيد التحضير"], ["ready", "جاهز"], ["out_for_delivery", "خرج للتوصيل"], ["completed", "تم التسليم"], ["cancelled", "إلغاء الطلب…"]];

function currentOf(o) {
  if (o.fulfillment_status === "out_for_delivery") return "out_for_delivery";
  if (o.kitchen_status === "ready" || o.kitchen_status === "served") return "ready";
  if (o.kitchen_status === "preparing") return "preparing";
  return "";
}

export default function OwnerStatusControl({ order, onChanged }) {
  const { role } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (role !== "owner" || order.channel !== "delivery" || !["accepted", "out_for_delivery"].includes(order.fulfillment_status)) return null;
  const current = currentOf(order);

  async function change(e) {
    const status = e.target.value;
    if (!status || status === current) return;
    const label = OPTIONS.find(([v]) => v === status)?.[1];
    let reason;
    if (status === "cancelled") {
      reason = window.prompt("سبب إلغاء الطلب (يظهر للزبون):", "نعتذر، لا نستطيع توصيل الطلب الآن");
      if (!reason || reason.trim().length < 2) return;
    } else if (!window.confirm(`تغيير حالة الطلب إلى «${label}»؟ يتجاوز هذا تسلسل المطبخ والتوصيل.`)) return;
    setBusy(true);
    try {
      await overrideOutsideStatus(order.id, status, reason?.trim());
      toast.success(status === "cancelled" ? "أُلغي الطلب." : `صارت الحالة «${label}».`);
      onChanged?.();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="flex items-center gap-2 rounded-xl border border-dashed border-copper/50 bg-copper/[0.04] p-2 text-xs font-bold">
      <span className="shrink-0 text-copper-ink">تعديل الحالة (المالك)</span>
      <select aria-label={`تعديل حالة الطلب ${order.order_number}`} value={current} disabled={busy} onChange={change}
        className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-white px-2 text-sm">
        {!current && <option value="">بانتظار المطبخ</option>}
        {OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
