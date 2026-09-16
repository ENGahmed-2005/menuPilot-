import { useEffect, useState } from "react";
import { LayoutGrid, Plus, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { createTable, deleteTable, getTables, updateTable } from "../../api/tables";
import { useAuth } from "../../context/AuthContext";
import { getSubscriptionPlan } from "../../config/subscriptions";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";
import QRCodeModal from "./components/QRCodeModal";
import TableCard from "./components/TableCard";

const fieldClass = "w-full rounded-lg border border-ink/15 px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-2 focus:ring-copper/20";

export default function Tables() {
  const { user } = useAuth();
  const plan = getSubscriptionPlan(user?.plan);
  const [tables, setTables] = useState([]);
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
    if (!window.confirm("هل أنت متأكد من حذف هذه الطاولة؟")) return;
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
    <div dir="rtl">
      {qrTable && <QRCodeModal table={qrTable} onClose={() => setQrTable(null)} />}
      <PageHeader title="الطاولات" subtitle={`إدارة طاولات المطعم وإنشاء QR خاص لكل طاولة. (${tables.length} من ${plan.limits.tables === Infinity ? "∞" : plan.limits.tables} · ${plan.name})`} />
      {atLimit && <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-copper/25 bg-copper/5 p-4 text-sm"><span className="flex items-center gap-2 font-medium text-copper-deep"><Crown size={16}/> وصلت للحد الأقصى لعدد الطاولات.</span><Link to="/owner/subscription/pro" className="font-bold text-copper-deep hover:underline">ترقية الباقة →</Link></Card>}
      <Card as="form" onSubmit={handleAdd} className={`mb-6 flex flex-wrap items-end gap-3 p-4 ${atLimit ? "opacity-50" : ""}`}>
        <fieldset disabled={atLimit} className="contents"><div className="min-w-40 flex-1"><label className="mb-1.5 block text-xs font-medium text-ink-soft">اسم الطاولة</label><input placeholder="مثال: طاولة 07" value={label} onChange={(e) => setLabel(e.target.value)} required className={fieldClass}/></div><div className="w-24"><label className="mb-1.5 block text-xs font-medium text-ink-soft">المقاعد</label><input type="number" min={1} max={100} value={seats} onChange={(e) => setSeats(e.target.value)} className={fieldClass}/></div><Button type="submit"><Plus size={16}/> إضافة طاولة</Button></fieldset>
      </Card>
      {error && <p role="alert" className="mb-4 rounded-lg bg-brick/10 px-3 py-2 text-sm text-brick">{error?.response?.data?.message || error?.message || "حدث خطأ أثناء تنفيذ العملية."}</p>}
      {loading ? <Spinner label="جارِ تحميل الطاولات…" /> : tables.length === 0 ? <Card><EmptyState icon={LayoutGrid} title="لا توجد طاولات بعد" description="أضف أول طاولة من الفورم أعلاه." /></Card> : <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tables.map((table) => <TableCard key={table.id} table={table} editing={editingId === table.id} editLabel={editLabel} editSeats={editSeats} saving={savingEdit} onStartEdit={startEdit} onCancelEdit={cancelEdit} onSaveEdit={handleSaveEdit} onDelete={handleDelete} onQr={setQrTable} onLabelChange={setEditLabel} onSeatsChange={setEditSeats} />)}</ul>}
    </div>
  );
}
