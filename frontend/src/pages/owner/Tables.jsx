import { useEffect, useState } from "react";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { LayoutGrid, Plus, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { createTable, deleteTable, getTables, setTableStatus, updateTable } from "../../api/tables";
import { useToast } from "../../components/ui/Toast";
import { useSubscription } from "../../hooks/useSubscription";
import Modal from "../../components/ui/Modal";
import Alert from "../../components/ui/Alert";
import Input from "../../components/ui/Input";
import { money } from "../../utils/format";
import { Link as RouterLink } from "react-router-dom";
import { errorText } from "../../utils/errors";
import { useAuth } from "../../context/AuthContext";
import { getSubscriptionPlan, subscriptionOf } from "../../config/subscriptions";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";
import QRCodeModal from "./components/QRCodeModal";
import TableCard from "./components/TableCard";
import { t as tr, dir } from "../../i18n";

const fieldClass = "w-full rounded-lg border border-ink/15 px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-2 focus:ring-copper/20";

export default function Tables() {
  const [confirm, confirmDialog] = useConfirm();
  const { user } = useAuth();
  const plan = getSubscriptionPlan(subscriptionOf(user).plan);
  const [tables, setTables] = useState([]);
  const { canOperate } = useSubscription();
  const [statusBusy, setStatusBusy] = useState(null);
  // Occupied table → the API returns the open session; confirm ending it here.
  const [ending, setEnding] = useState(null); // { table, status, session, reason, saving, error }
  const toast = useToast();

  // Reserved / out-of-service tables can't be opened from their QR code.
  const STATUS_WORD = { available: tr("متاحة"), reserved: tr("محجوزة"), out_of_service: tr("خارج الخدمة") };

  async function handleStatusChange(table, status, extra) {
    if (status === "occupied") return;
    setStatusBusy(table.id);
    try {
      const updated = await setTableStatus(table.id, status, extra);
      setTables((list) => list.map((t) => (t.id === table.id ? { ...t, ...updated } : t)));
      setEnding(null);
      toast.success(extra?.close_session ? tr("أُنهيت الجلسة وأصبحت {0} {1}.", { 0: table.label, 1: STATUS_WORD[status] }) : tr("أصبحت {0} {1}.", { 0: table.label, 1: STATUS_WORD[status] }));
    } catch (err) {
      if (err.code === "TABLE_HAS_ACTIVE_SESSION" && err.data?.session) {
        setEnding({ table, status, session: err.data.session, reason: "", saving: false, error: null });
      } else if (ending) {
        setEnding((e) => ({ ...e, saving: false, error: err }));
      } else {
        toast.error(errorText(err, tr("تعذّر تغيير حالة الطاولة.")));
      }
    } finally {
      setStatusBusy(null);
    }
  }

  function confirmEnd(event) {
    event.preventDefault();
    const owed = Number(ending.session.outstanding) > 0;
    if (owed && ending.reason.trim().length < 3) {
      setEnding((e) => ({ ...e, error: { message: tr("اكتب سبب إنهاء الجلسة دون دفع المبلغ المتبقي."), friendly: true } }));
      return;
    }
    setEnding((e) => ({ ...e, saving: true, error: null }));
    handleStatusChange(ending.table, ending.status, { close_session: true, reason: owed ? ending.reason.trim() : undefined });
  }
  const [label, setLabel] = useState("");
  const [seats, setSeats] = useState(2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrTable, setQrTable] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editSeats, setEditSeats] = useState(2);
  const [savingEdit, setSavingEdit] = useState(false);
  const atLimit = tables.length >= plan.limits.tables;

  async function load() {
    setLoading(true); setError(null);
    try { setTables(await getTables()); } catch (err) { setError(err); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    try { await createTable({ label: label.trim(), seats: Number(seats) }); setLabel(""); setSeats(2); await load(); }
    catch (err) { setError(err); }
  }
  async function handleDelete(id) {
    const table = tables.find((t) => t.id === id);
    const ok = await confirm({
      title: tr("حذف طاولة {0}؟", { 0: table?.label ?? "" }),
      description: tr("سيتوقف رمز QR المطبوع لهذه الطاولة عن العمل. لا يمكن التراجع عن الحذف."),
      confirmLabel: tr("حذف الطاولة"),
      tone: "danger",
    });
    if (!ok) return;
    try { await deleteTable(id); await load(); } catch (err) { setError(err); }
  }
  function startEdit(table) { setEditingId(table.id); setEditLabel(table.label); setEditSeats(table.seats); }
  function cancelEdit() { setEditingId(null); setEditLabel(""); setEditSeats(2); }
  async function handleSaveEdit(e, id) {
    e.preventDefault(); setSavingEdit(true);
    try { await updateTable(id, { label: editLabel.trim(), seats: Number(editSeats) }); cancelEdit(); await load(); }
    catch (err) { setError(err); } finally { setSavingEdit(false); }
  }

  return (
    <div dir={dir}>
      {confirmDialog}
      <Modal
        open={Boolean(ending)}
        onClose={() => !ending?.saving && setEnding(null)}
        size="sm"
        title={ending ? tr("على {0} جلسة نشطة", { 0: ending.table.label }) : ""}
        description={ending ? tr("لجعلها «{0}» يجب إنهاء الجلسة الحالية. بعد ذلك لن يستطيع الزبون إضافة طلبات إليها.", { 0: STATUS_WORD[ending.status] }) : ""}
      >
        {ending && (
          <form onSubmit={confirmEnd} className="space-y-4">
            <dl className="divide-y divide-line rounded-xl border border-line text-sm">
              <div className="flex justify-between px-4 py-2.5"><dt className="text-muted">{tr("رقم الجلسة")}</dt><dd className="num font-bold">#{ending.session.session_id}</dd></div>
              <div className="flex justify-between px-4 py-2.5"><dt className="text-muted">{tr("إجمالي الفاتورة")}</dt><dd className="num font-bold">{money(ending.session.billTotal)}</dd></div>
              <div className="flex justify-between px-4 py-2.5"><dt className="text-muted">{tr("المدفوع")}</dt><dd className="num font-bold text-herb">{money(ending.session.paidTotal)}</dd></div>
              <div className="flex justify-between px-4 py-2.5"><dt className="font-bold">{tr("المتبقي")}</dt><dd className="num font-extrabold">{money(ending.session.outstanding)}</dd></div>
            </dl>

            {ending.session.hasPendingPayment ? (
              <Alert tone="warning" action={<RouterLink to={`/cashier/billing/${ending.session.session_id}`} className="text-sm font-bold underline">{tr("فتح الفاتورة")}</RouterLink>}>
                {tr("يوجد دفع من الزبون بانتظار التأكيد. أكّده أو ارفضه أولًا.")}
              </Alert>
            ) : Number(ending.session.outstanding) > 0 ? (
              <>
                <Alert tone="warning">{tr("يوجد مبلغ متبقٍ لم يُدفع. إنهاء الجلسة الآن يسجّل المبلغ واسمك والسبب في سجل التدقيق.")}</Alert>
                <Input label={tr("سبب إنهاء الجلسة دون دفع")} required autoFocus maxLength={255} value={ending.reason}
                  onChange={(e) => setEnding((x) => ({ ...x, reason: e.target.value, error: null }))} placeholder={tr("مثل: الزبون غادر، طلب تجريبي")} />
              </>
            ) : null}

            {ending.error && <Alert tone="danger">{errorText(ending.error, tr("تعذّر إنهاء الجلسة."))}</Alert>}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEnding(null)} disabled={ending.saving}>{tr("تراجع")}</Button>
              {!ending.session.hasPendingPayment && (
                <Button type="submit" variant={Number(ending.session.outstanding) > 0 ? "danger" : "dark"} loading={ending.saving}>
                  {tr("إنهاء الجلسة وتغيير الحالة")}
                </Button>
              )}
            </div>
          </form>
        )}
      </Modal>
      {qrTable && <QRCodeModal table={qrTable} onClose={() => setQrTable(null)} />}
      <PageHeader title={tr("الطاولات")} subtitle={tr("إدارة طاولات المطعم وإنشاء QR خاص لكل طاولة. ({0} من {1} · {2})", { 0: tables.length, 1: plan.limits.tables === Infinity ? "∞" : plan.limits.tables, 2: plan.name })} />
      {atLimit && <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-copper/25 bg-copper/5 p-4 text-sm"><span className="flex items-center gap-2 font-medium text-copper-ink"><Crown size={16}/> {tr("وصلت للحد الأقصى لعدد الطاولات.")}</span><Link to="/owner/subscription/pro" className="font-bold text-copper-ink hover:underline">{tr("ترقية الباقة →")}</Link></Card>}
      <Card as="form" onSubmit={handleAdd} className={`mb-6 flex flex-wrap items-end gap-3 p-4 ${atLimit ? "opacity-50" : ""}`}>
        <fieldset disabled={atLimit} className="contents"><div className="min-w-40 flex-1"><label className="mb-1.5 block text-xs font-medium text-ink-soft">{tr("اسم الطاولة")}</label><input placeholder={tr("مثال: طاولة 07")} value={label} onChange={(e) => setLabel(e.target.value)} required className={fieldClass}/></div><div className="w-24"><label className="mb-1.5 block text-xs font-medium text-ink-soft">{tr("المقاعد")}</label><input type="number" min={1} max={100} value={seats} onChange={(e) => setSeats(e.target.value)} className={fieldClass}/></div><Button type="submit" disabled={!canOperate} title={!canOperate ? tr("متوقف بعد انتهاء الفترة التجريبية") : undefined}><Plus size={16}/> {tr("إضافة طاولة")}</Button></fieldset>
      </Card>
      {error && <p role="alert" className="mb-4 rounded-lg bg-brick/10 px-3 py-2 text-sm text-brick">{error?.response?.data?.message || error?.message || tr("حدث خطأ أثناء تنفيذ العملية.")}</p>}
      {loading ? <Spinner label={tr("جارِ تحميل الطاولات…")} /> : tables.length === 0 ? <Card><EmptyState icon={LayoutGrid} title={tr("لا توجد طاولات بعد")} description={tr("أضف أول طاولة من الفورم أعلاه.")} /></Card> : <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tables.map((table) => <TableCard key={table.id} table={table} editing={editingId === table.id} editLabel={editLabel} editSeats={editSeats} saving={savingEdit} onStartEdit={startEdit} onCancelEdit={cancelEdit} onSaveEdit={handleSaveEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} statusBusy={statusBusy === table.id} onQr={setQrTable} onLabelChange={setEditLabel} onSeatsChange={setEditSeats} />)}</ul>}
    </div>
  );
}
