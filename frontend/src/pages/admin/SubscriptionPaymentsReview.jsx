/* ==========================================================================
   SubscriptionPaymentsReview.jsx — admin: bank transfers reported by owners.
   Verify → the plan is activated for the paid months. Reject → with a reason
   the owner sees. Everything is audited server-side.
   ========================================================================== */
import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Landmark, XCircle } from "lucide-react";
import { getSubscriptionPayments, rejectSubscriptionPayment, verifySubscriptionPayment } from "../../api/subscription";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../components/ui/Toast";
import { errorText } from "../../utils/errors";

const date = (v) => (v ? new Date(v).toLocaleDateString("ar-PS-u-nu-latn", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default function SubscriptionPaymentsReview({ onChanged }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("pending");
  const [busy, setBusy] = useState(null);
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();

  const load = () => getSubscriptionPayments(status).then((d) => setRows(d || [])).catch((e) => toast.error(errorText(e)));
  useEffect(() => { load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function verify(p) {
    if (!(await confirm({ title: `تأكيد دفعة ${p.invoice_number}؟`, description: `سيُفعَّل اشتراك «${p.plan_name}» لمطعم ${p.restaurant_name || p.email} لمدة ${p.months} شهر. تأكد أولًا من وصول ${p.amount} ${p.currency} إلى حساب بنك فلسطين.`, confirmLabel: "تأكيد وتفعيل" }))) return;
    setBusy(p.id);
    try { await verifySubscriptionPayment(p.id); toast.success("فُعّل الاشتراك."); load(); onChanged?.(); } catch (e) { toast.error(errorText(e)); } finally { setBusy(null); }
  }
  async function reject(p) {
    const reason = window.prompt("سبب الرفض (يظهر لصاحب المطعم):", "لم يصل المبلغ إلى الحساب");
    if (!reason || reason.trim().length < 3) return;
    setBusy(p.id);
    try { await rejectSubscriptionPayment(p.id, reason.trim()); toast.success("رُفضت الدفعة."); load(); onChanged?.(); } catch (e) { toast.error(errorText(e)); } finally { setBusy(null); }
  }

  return (
    <section className="admin-table-card" style={{ marginBottom: 20 }}>
      {confirmDialog}
      <div className="admin-table-heading">
        <div><p>تحويلات بنك فلسطين</p><h2><Landmark size={16} style={{ display: "inline", marginLeft: 6 }} aria-hidden="true" />مدفوعات الاشتراك</h2></div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="حالة الدفعات" className="h-9 rounded-lg border border-line bg-surface px-2 text-xs font-bold">
          <option value="pending">بانتظار التحقق</option><option value="verified">مؤكدة</option><option value="rejected">مرفوضة</option><option value="all">الكل</option>
        </select>
      </div>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead><tr><th>الفاتورة</th><th>المطعم</th><th>الخطة</th><th>المبلغ</th><th>المحوِّل</th><th>التاريخ / المرجع</th><th>الإشعار</th><th>إجراء</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td><strong dir="ltr">{p.invoice_number}</strong><div className="text-xs text-muted">{date(p.created_at)}</div></td>
                <td>{p.restaurant_name || "—"}<div className="text-xs text-muted" dir="ltr">{p.email} · {p.reference_code}</div></td>
                <td>{p.plan_name} · {p.months} شهر</td>
                <td><strong>{p.amount} {p.currency}</strong></td>
                <td>{p.payer_name || "—"}</td>
                <td>{date(p.transfer_date)}<div className="text-xs text-muted" dir="ltr">{p.transfer_reference || "—"}</div></td>
                <td>{p.proof_url ? <a href={p.proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-copper-ink">عرض <ExternalLink size={13} aria-hidden="true" /></a> : "—"}</td>
                <td>
                  {p.status === "pending" ? (
                    <div className="admin-actions">
                      <button className="admin-enable" disabled={busy === p.id} onClick={() => verify(p)}><CheckCircle2 size={14} aria-hidden="true" /> تأكيد</button>
                      <button className="admin-disable" disabled={busy === p.id} onClick={() => reject(p)}><XCircle size={14} aria-hidden="true" /> رفض</button>
                    </div>
                  ) : <span className={`admin-status ${p.status === "verified" ? "active" : "inactive"}`}><i />{p.status === "verified" ? "مؤكدة" : `مرفوضة${p.rejection_reason ? `: ${p.rejection_reason}` : ""}`}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="admin-empty">{status === "pending" ? "لا توجد تحويلات بانتظار التحقق." : "لا توجد دفعات."}</div>}
      </div>
    </section>
  );
}
