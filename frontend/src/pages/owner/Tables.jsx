/* ==========================================================================
   Tables.jsx — إدارة طاولات المطعم
   يغطي: FR-04 (إضافة), FR-05 (تعديل), FR-06 (حذف), FR-07 (QR تلقائي)
   ========================================================================== */
import { useEffect, useState } from "react";
import { LayoutGrid, Plus, QrCode, Trash2, Users, Pencil, X, Check, Crown } from "lucide-react";
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

const fieldClass =
  "w-full rounded-lg border border-ink/15 px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-2 focus:ring-copper/20";

export default function Tables() {
  const { user } = useAuth();
  const plan = getSubscriptionPlan(user?.plan);
  const [tables, setTables] = useState([]);
  const [label, setLabel] = useState("");
  const [seats, setSeats] = useState(2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const atLimit = tables.length >= plan.limits.tables;

  // --- حالة التعديل (Edit) ---
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editSeats, setEditSeats] = useState(2);
  const [savingEdit, setSavingEdit] = useState(false);

  function load() {
    setLoading(true);
    getTables()
      .then(setTables)
      .catch(setError)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await createTable({ label, seats: Number(seats) });
      setLabel("");
      setSeats(2);
      load();
    } catch (err) {
      setError(err);
    }
  }

  async function handleDelete(tableId) {
    try {
      await deleteTable(tableId);
      load();
    } catch (err) {
      setError(err);
    }
  }

  function startEdit(t) {
    setEditingId(t.id);
    setEditLabel(t.label);
    setEditSeats(t.seats);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditLabel("");
    setEditSeats(2);
  }

  async function handleSaveEdit(e, tableId) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await updateTable(tableId, { label: editLabel, seats: Number(editSeats) });
      cancelEdit();
      load();
    } catch (err) {
      setError(err);
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="الطاولات"
        subtitle={`أضف طاولات مطعمك واحصل على رمز QR لكل واحدة. (${tables.length} من ${plan.limits.tables === Infinity ? "∞" : plan.limits.tables} — باقة ${plan.name})`}
      />

      {atLimit && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-copper/25 bg-copper/5 p-4 text-sm">
          <span className="flex items-center gap-2 font-medium text-copper-deep">
            <Crown size={16} /> وصلت للحد الأقصى لعدد الطاولات في باقة {plan.name}.
          </span>
          <Link to="/owner/subscription/pro" className="font-bold text-copper-deep hover:underline">
            رقّي باقتك →
          </Link>
        </Card>
      )}

      <Card as="form" onSubmit={handleAdd} className={`mb-6 flex flex-wrap items-end gap-3 p-4 ${atLimit ? "opacity-50" : ""}`}>
        <fieldset disabled={atLimit} className="contents">
        <div className="min-w-40 flex-1">
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">اسم الطاولة</label>
          <input
            placeholder="مثال: طاولة 07"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            className={fieldClass}
          />
        </div>
        <div className="w-24">
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">المقاعد</label>
          <input
            type="number"
            min={1}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            className={fieldClass}
          />
        </div>
        <Button type="submit">
          <Plus size={16} />
          إضافة طاولة
        </Button>
        </fieldset>
      </Card>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-brick/10 px-3 py-2 text-sm text-brick">
          {error.message}
        </p>
      )}

      {loading ? (
        <Spinner label="جارِ تحميل الطاولات…" />
      ) : tables.length === 0 ? (
        <Card>
          <EmptyState icon={LayoutGrid} title="لا توجد طاولات بعد" description="أضف أول طاولة من الفورم أعلاه." />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => {
            const isEditing = editingId === t.id;

            return (
              <Card key={t.id} as="li" className="flex flex-col gap-3 p-4">
                {isEditing ? (
                  /* ---------- وضع التعديل ---------- */
                  <form onSubmit={(e) => handleSaveEdit(e, t.id)} className="flex flex-col gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-ink-soft">اسم الطاولة</label>
                      <input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        required
                        autoFocus
                        className={fieldClass}
                      />
                    </div>
                    <div className="w-24">
                      <label className="mb-1.5 block text-xs font-medium text-ink-soft">المقاعد</label>
                      <input
                        type="number"
                        min={1}
                        value={editSeats}
                        onChange={(e) => setEditSeats(e.target.value)}
                        className={fieldClass}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-ink/8 pt-3">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={savingEdit}
                        className="flex items-center gap-1 text-sm text-ink-soft hover:opacity-75"
                        title="إلغاء"
                      >
                        <X size={16} />
                        إلغاء
                      </button>
                      <Button type="submit" disabled={savingEdit}>
                        <Check size={16} />
                        {savingEdit ? "جارِ الحفظ…" : "حفظ"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  /* ---------- وضع العرض ---------- */
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="block font-medium text-ink">{t.label}</span>
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
                          <Users size={13} aria-hidden="true" />
                          {t.seats} مقاعد
                        </span>
                      </div>
                      <Badge tone={t.status === "Available" ? "good" : "warning"}>{t.status}</Badge>
                    </div>

                    <div className="mt-1 flex items-center justify-between border-t border-ink/8 pt-3 text-sm">
                      {t.qrCodeUrl ? (
                        <a
                          href={t.qrCodeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 font-medium text-copper-deep hover:underline"
                        >
                          <QrCode size={14} aria-hidden="true" />
                          عرض رمز QR
                        </a>
                      ) : (
                        <span />
                      )}

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => startEdit(t)}
                          className="text-ink-soft hover:opacity-75"
                          title="تعديل الطاولة"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-brick hover:opacity-75"
                          title="حذف الطاولة"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}