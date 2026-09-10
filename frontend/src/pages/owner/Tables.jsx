import { useEffect, useState } from "react";
import { LayoutGrid, Plus, QrCode, Trash2, Users, Pencil, X, Check, Crown, ExternalLink, Printer } from "lucide-react";
import { Link } from "react-router-dom";
import { createTable, deleteTable, getTables, updateTable } from "../../api/tables";
import { useAuth } from "../../context/AuthContext";
import { getSubscriptionPlan } from "../../config/subscriptions";
import Spinner from "../../components/ui/Spinner";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";

const fieldClass = "w-full rounded-lg border border-ink/15 px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-2 focus:ring-copper/20";

function QRModal({ table, onClose }) {
  if (!table) return null;
  const scanUrl = new URL(table.qrCodeUrl || `/t/${table.table_code || table.code}`, window.location.origin).href;
  const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(scanUrl)}`;

  function printQr() {
    const popup = window.open("", "_blank", "width=500,height=650");
    if (!popup) return;
    popup.document.write(`<html dir="rtl"><head><title>QR - ${table.label}</title></head><body style="font-family:Arial;text-align:center;padding:32px"><h2>${table.label}</h2><img src="${qrImage}" width="320" height="320"/><p>${scanUrl}</p><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/65 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div dir="rtl" className="w-full max-w-md rounded-[2rem] bg-paper p-6 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><span className="inline-flex items-center gap-2 rounded-full bg-copper/10 px-3 py-1 text-xs font-black text-copper"><QrCode size={14}/> رمز QR</span><h2 className="mt-3 text-2xl font-black">{table.label}</h2><p className="mt-1 text-xs text-ink-soft/55">امسح الرمز لفتح قائمة الطاولة.</p></div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-ink-soft hover:bg-ink/5" aria-label="إغلاق"><X size={18}/></button>
        </div>
        <div className="mx-auto mt-6 w-fit rounded-3xl border border-ink/8 bg-white p-4 shadow-sm"><img src={qrImage} alt={`رمز QR لـ ${table.label}`} width="280" height="280" /></div>
        <div className="mt-5 rounded-2xl bg-paper-2 p-3 text-center text-xs break-all text-ink-soft/65">{scanUrl}</div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <a href={scanUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-full border border-ink/12 px-4 py-3 text-sm font-black text-ink transition hover:bg-ink/5"><ExternalLink size={15}/> فتح الطاولة</a>
          <button type="button" onClick={printQr} className="flex items-center justify-center gap-2 rounded-full bg-copper px-4 py-3 text-sm font-black text-ink transition hover:bg-copper-deep"><Printer size={15}/> طباعة QR</button>
        </div>
      </div>
    </div>
  );
}

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

  function load() {
    setLoading(true); setError(null);
    getTables().then(setTables).catch(setError).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    try { await createTable({ label: label.trim(), seats: Number(seats) }); setLabel(""); setSeats(2); load(); }
    catch (err) { setError(err); }
  }
  async function handleDelete(tableId) {
    if (!window.confirm("هل أنت متأكد من حذف هذه الطاولة؟")) return;
    try { await deleteTable(tableId); load(); } catch (err) { setError(err); }
  }
  function startEdit(t) { setEditingId(t.id); setEditLabel(t.label); setEditSeats(t.seats); }
  function cancelEdit() { setEditingId(null); setEditLabel(""); setEditSeats(2); }
  async function handleSaveEdit(e, tableId) {
    e.preventDefault(); setSavingEdit(true);
    try { await updateTable(tableId, { label: editLabel.trim(), seats: Number(editSeats) }); cancelEdit(); load(); }
    catch (err) { setError(err); }
    finally { setSavingEdit(false); }
  }

  return (
    <div dir="rtl">
      {qrTable && <QRModal table={qrTable} onClose={() => setQrTable(null)} />}
      <PageHeader title="الطاولات" subtitle={`أضف طاولات مطعمك واحصل على رمز QR لكل واحدة. (${tables.length} من ${plan.limits.tables === Infinity ? "∞" : plan.limits.tables} — باقة ${plan.name})`} />
      {atLimit && <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-copper/25 bg-copper/5 p-4 text-sm"><span className="flex items-center gap-2 font-medium text-copper-deep"><Crown size={16}/> وصلت للحد الأقصى لعدد الطاولات في باقة {plan.name}.</span><Link to="/owner/subscription/pro" className="font-bold text-copper-deep hover:underline">رقّي باقتك →</Link></Card>}
      <Card as="form" onSubmit={handleAdd} className={`mb-6 flex flex-wrap items-end gap-3 p-4 ${atLimit ? "opacity-50" : ""}`}>
        <fieldset disabled={atLimit} className="contents">
          <div className="min-w-40 flex-1"><label className="mb-1.5 block text-xs font-medium text-ink-soft">اسم الطاولة</label><input placeholder="مثال: طاولة 07" value={label} onChange={(e) => setLabel(e.target.value)} required className={fieldClass}/></div>
          <div className="w-24"><label className="mb-1.5 block text-xs font-medium text-ink-soft">المقاعد</label><input type="number" min={1} max={100} value={seats} onChange={(e) => setSeats(e.target.value)} className={fieldClass}/></div>
          <Button type="submit"><Plus size={16}/> إضافة طاولة</Button>
        </fieldset>
      </Card>
      {error && <p role="alert" className="mb-4 rounded-lg bg-brick/10 px-3 py-2 text-sm text-brick">{error?.response?.data?.message || error?.message || "حدث خطأ أثناء تنفيذ العملية."}</p>}
      {loading ? <Spinner label="جارِ تحميل الطاولات…" /> : tables.length === 0 ? <Card><EmptyState icon={LayoutGrid} title="لا توجد طاولات بعد" description="أضف أول طاولة من الفورم أعلاه." /></Card> : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => {
            const isEditing = editingId === t.id;
            const isAvailable = String(t.status).toLowerCase() === "available";
            return <Card key={t.id} as="li" className="flex flex-col gap-3 p-4">
              {isEditing ? <form onSubmit={(e) => handleSaveEdit(e, t.id)} className="flex flex-col gap-3">
                <div><label className="mb-1.5 block text-xs font-medium text-ink-soft">اسم الطاولة</label><input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} required autoFocus className={fieldClass}/></div>
                <div className="w-24"><label className="mb-1.5 block text-xs font-medium text-ink-soft">المقاعد</label><input type="number" min={1} max={100} value={editSeats} onChange={(e) => setEditSeats(e.target.value)} className={fieldClass}/></div>
                <div className="flex items-center justify-end gap-2 border-t border-ink/8 pt-3"><button type="button" onClick={cancelEdit} disabled={savingEdit} className="flex items-center gap-1 text-sm text-ink-soft"><X size={16}/> إلغاء</button><Button type="submit" disabled={savingEdit}><Check size={16}/> {savingEdit ? "جارِ الحفظ…" : "حفظ"}</Button></div>
              </form> : <>
                <div className="flex items-start justify-between gap-2"><div><span className="block font-medium text-ink">{t.label}</span><span className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft"><Users size={13}/> {t.seats} مقاعد</span></div><Badge tone={isAvailable ? "good" : "warning"}>{t.status}</Badge></div>
                <div className="mt-1 flex items-center justify-between border-t border-ink/8 pt-3 text-sm">
                  <button type="button" onClick={() => setQrTable(t)} className="flex items-center gap-1.5 font-medium text-copper-deep hover:underline"><QrCode size={14}/> عرض رمز QR</button>
                  <div className="flex items-center gap-3"><button type="button" onClick={() => startEdit(t)} className="text-ink-soft hover:opacity-75" title="تعديل الطاولة"><Pencil size={16}/></button><button type="button" onClick={() => handleDelete(t.id)} className="text-brick hover:opacity-75" title="حذف الطاولة"><Trash2 size={16}/></button></div>
                </div>
              </>}
            </Card>;
          })}
        </ul>
      )}
    </div>
  );
}
