/* ==========================================================================
   CloseSessionButton.jsx — closes a dining session (US-17).
   - Only rendered for users with the close_session permission (UX); the
     API checks the same permission and the payment rules again.
   - Disabled with the reason when closing isn't allowed yet.
   - Confirmation shows table, session, total, paid and remaining, so the
     cashier sees exactly what they are closing.
   session: { id, tableLabel, billTotal, paidTotal, outstanding, canClose,
              closeBlocker }   (fields from GET /sessions or the bill)
   ========================================================================== */
import { useState } from "react";
import { DoorClosed } from "lucide-react";
import { closeSession } from "../../api/billing";
import { usePermissions } from "../../hooks/usePermissions";
import { errorText } from "../../utils/errors";
import { money, tableName } from "../../utils/format";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import Alert from "../ui/Alert";
import { useToast } from "../ui/Toast";
import { t } from "../../i18n";

const BLOCKERS = {
  OUTSTANDING_BALANCE: t("يوجد مبلغ متبقٍ لم يُدفع بعد."),
  PAYMENT_PENDING_VERIFICATION: t("يوجد دفع من الزبون بانتظار التأكيد."),
  PAYMENT_REQUIRED: t("لم يُسجَّل أي دفع لهذه الجلسة بعد."),
  SESSION_ALREADY_CLOSED: t("هذه الجلسة مغلقة بالفعل."),
};

export default function CloseSessionButton({ session, onClosed, block = false, size = "md" }) {
  const { can } = usePermissions();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState(null);

  if (!session || !can("close_session")) return null;

  const table = tableName(session.tableLabel || session.table_label);
  const blocked = session.canClose === false;

  async function confirmClose() {
    setClosing(true);
    setError(null);
    try {
      const result = await closeSession(session.id);
      setOpen(false);
      if (result?.queued) toast.info(t("لا يوجد اتصال: سيُغلق جلسة {0} تلقائيًا عند عودة الإنترنت.", { 0: table }));
      else toast.success(t("أُغلقت جلسة {0}، والطاولة متاحة الآن.", { 0: table }));
      onClosed?.(session);
    } catch (err) {
      setError(err);
    } finally {
      setClosing(false);
    }
  }

  return (
    <div>
      <Button variant="dark" size={size} block={block} disabled={blocked} onClick={() => { setError(null); setOpen(true); }}>
        <DoorClosed size={16} aria-hidden="true" /> {t("إغلاق الجلسة")}
      </Button>
      {blocked && session.closeBlocker && <p className="mt-1.5 text-xs font-bold text-muted">{BLOCKERS[session.closeBlocker]}</p>}

      <Modal
        open={open}
        onClose={() => !closing && setOpen(false)}
        size="sm"
        title={t("هل أنت متأكد من إغلاق جلسة {0}؟", { 0: table })}
        description={t("بعد الإغلاق ستصبح الطاولة متاحة لجلسة جديدة، ولن يستطيع الزبون إضافة طلبات لهذه الجلسة.")}
        footer={<>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={closing}>{t("تراجع")}</Button>
          <Button variant="dark" loading={closing} onClick={confirmClose}>{t("تأكيد الإغلاق")}</Button>
        </>}
      >
        <dl className="divide-y divide-line rounded-xl border border-line text-sm">
          <div className="flex justify-between px-4 py-2.5"><dt className="text-muted">{t("الطاولة")}</dt><dd className="font-bold">{table}</dd></div>
          <div className="flex justify-between px-4 py-2.5"><dt className="text-muted">{t("رقم الجلسة")}</dt><dd className="num font-bold">#{session.id}</dd></div>
          <div className="flex justify-between px-4 py-2.5"><dt className="text-muted">{t("إجمالي الفاتورة")}</dt><dd className="num font-bold">{money(session.billTotal)}</dd></div>
          <div className="flex justify-between px-4 py-2.5"><dt className="text-muted">{t("المدفوع")}</dt><dd className="num font-bold text-herb">{money(session.paidTotal)}</dd></div>
          <div className="flex justify-between px-4 py-2.5"><dt className="font-bold">{t("المتبقي")}</dt><dd className="num font-extrabold">{money(session.outstanding)}</dd></div>
        </dl>
        {error && <Alert tone="danger" className="mt-4">{errorText(error, t("تعذّر إغلاق الجلسة."))}</Alert>}
      </Modal>
    </div>
  );
}
