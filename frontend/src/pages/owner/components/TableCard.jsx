import { Check, Pencil, QrCode, Trash2, Users, X } from "lucide-react";
import Card from "../../../components/dashboard/Card";
import Button from "../../../components/ui/Button";
import TableStatusBadge from "./TableStatusBadge";

const fieldClass = "w-full rounded-lg border border-ink/15 px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-2 focus:ring-copper/20";

export default function TableCard({ table, editing, editLabel, editSeats, saving, onStartEdit, onCancelEdit, onSaveEdit, onDelete, onQr, onLabelChange, onSeatsChange }) {
  const occupied = Boolean(table.activeSessionId) || String(table.status).toLowerCase() === "occupied";

  return (
    <Card as="li" className="flex flex-col gap-3 p-4">
      {editing ? (
        <form onSubmit={(e) => onSaveEdit(e, table.id)} className="flex flex-col gap-3">
          <div><label className="mb-1.5 block text-xs font-medium text-ink-soft">اسم الطاولة</label><input value={editLabel} onChange={(e) => onLabelChange(e.target.value)} required autoFocus className={fieldClass}/></div>
          <div className="w-24"><label className="mb-1.5 block text-xs font-medium text-ink-soft">المقاعد</label><input type="number" min={1} max={100} value={editSeats} onChange={(e) => onSeatsChange(e.target.value)} className={fieldClass}/></div>
          <div className="flex items-center justify-end gap-2 border-t border-ink/8 pt-3"><button type="button" onClick={onCancelEdit} disabled={saving} className="flex items-center gap-1 text-sm text-ink-soft"><X size={16}/> إلغاء</button><Button type="submit" disabled={saving}><Check size={16}/> {saving ? "جارِ الحفظ…" : "حفظ"}</Button></div>
        </form>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2"><div><span className="block font-medium text-ink">{table.label}</span><span className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft"><Users size={13}/> {table.seats} مقاعد</span></div><TableStatusBadge occupied={occupied}/></div>
          <div className="mt-1 flex items-center justify-between border-t border-ink/8 pt-3 text-sm"><button type="button" onClick={() => onQr(table)} className="flex items-center gap-1.5 font-medium text-copper-deep hover:underline"><QrCode size={14}/> عرض رمز QR</button><div className="flex items-center gap-3"><button type="button" onClick={() => onStartEdit(table)} className="text-ink-soft hover:opacity-75" title="تعديل الطاولة"><Pencil size={16}/></button><button type="button" onClick={() => onDelete(table.id)} className="text-brick hover:opacity-75" title="حذف الطاولة"><Trash2 size={16}/></button></div></div>
        </>
      )}
    </Card>
  );
}
