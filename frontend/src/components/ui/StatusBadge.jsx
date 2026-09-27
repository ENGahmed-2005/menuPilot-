/* ==========================================================================
   StatusBadge.jsx — one vocabulary for every status in menuPilot.
   Each status has an Arabic label, a tone AND an icon, so kitchen, waiter,
   cashier, owner and customer screens all describe the same state the same way.
   Usage: <StatusBadge type="order" status="preparing" />
   ========================================================================== */
import {
  Ban, BellRing, CheckCheck, CheckCircle2, CircleDashed, CircleDot, Clock3,
  CookingPot, Hourglass, Receipt, ShieldCheck, Utensils, XCircle,
} from "lucide-react";
import Badge from "./Badge";

export const STATUS = {
  order: {
    payment_pending: { label: "بانتظار تأكيد الدفع", tone: "info", icon: Hourglass },
    pending: { label: "جديد", tone: "warning", icon: CircleDot },
    preparing: { label: "قيد التحضير", tone: "info", icon: CookingPot },
    ready: { label: "جاهز للتقديم", tone: "success", icon: BellRing },
    served: { label: "تم التقديم", tone: "neutral", icon: CheckCheck },
    cancelled: { label: "ملغي", tone: "danger", icon: Ban },
  },
  table: {
    available: { label: "متاحة", tone: "success", icon: CheckCircle2 },
    occupied: { label: "مشغولة", tone: "warning", icon: Utensils },
    reserved: { label: "محجوزة", tone: "info", icon: Clock3 },
    out_of_service: { label: "خارج الخدمة", tone: "danger", icon: Ban },
  },
  session: {
    open: { label: "جلسة جديدة", tone: "neutral", icon: CircleDashed },
    ordering: { label: "يطلب الآن", tone: "info", icon: Utensils },
    payment_pending: { label: "بانتظار الدفع", tone: "info", icon: Hourglass },
    bill_requested: { label: "طلب الفاتورة", tone: "warning", icon: Receipt },
    closed: { label: "مغلقة", tone: "neutral", icon: CheckCheck },
  },
  // Derived by the API (SessionLifecycle) — the one source of truth for
  // where a dining session is: open → active → bill_requested →
  // payment_pending → paid → closed.
  lifecycle: {
    open: { label: "جلسة جديدة", tone: "neutral", icon: CircleDashed },
    active: { label: "نشطة", tone: "info", icon: Utensils },
    bill_requested: { label: "طلبت الفاتورة", tone: "warning", icon: Receipt },
    payment_pending: { label: "دفع بانتظار التأكيد", tone: "warning", icon: Hourglass },
    paid: { label: "مدفوعة، جاهزة للإغلاق", tone: "success", icon: ShieldCheck },
    closed: { label: "مغلقة", tone: "neutral", icon: CheckCheck },
  },
  payment: {
    pending: { label: "بانتظار المراجعة", tone: "warning", icon: Clock3 },
    verified: { label: "مؤكد", tone: "success", icon: ShieldCheck },
    pending_reconciliation: { label: "بانتظار التسوية", tone: "info", icon: Hourglass },
    rejected: { label: "مرفوض", tone: "danger", icon: XCircle },
  },
};

export function statusMeta(type, status) {
  // Accept "bill_requested", "Bill Requested" and "PREPARING" alike.
  const key = String(status || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return STATUS[type]?.[key] || { label: status || "—", tone: "neutral", icon: CircleDashed };
}

export default function StatusBadge({ type, status, className = "" }) {
  const { label, tone, icon } = statusMeta(type, status);
  return <Badge tone={tone} icon={icon} className={className}>{label}</Badge>;
}
