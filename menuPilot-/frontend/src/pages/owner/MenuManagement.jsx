/* ==========================================================================
   MenuManagement.jsx — إدارة أصناف القائمة
   يغطي: FR-08 (إضافة), FR-09 (تعديل), FR-10 (حذف)
   ========================================================================== */
import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Pencil, Plus, Trash2, UtensilsCrossed, X, Check } from "lucide-react";
import { createMenuItem, deleteMenuItem, getMenuItems, updateMenuItem } from "../../api/menu";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";

const EMPTY_FORM = { name: "", price: "", category: "", description: "", imageUrl: "" };
const fieldClass =
  "w-full rounded-lg border border-ink/15 px-3 py-2 text-sm text-ink outline-none focus:border-copper focus:ring-2 focus:ring-copper/20";

/** يحوّل ملف الصورة المختار إلى Data URL (base64) عشان نعرضه ونخزّنه بدون
 *  الحاجة لسيرفر تخزين ملفات فعلي — لحد ما يجهز الـ backend endpoint
 *  المخصّص لرفع الصور (multipart/form-data) واستبدال هذا بـ imageUrl حقيقي. */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const MAX_IMAGE_MB = 3;

export default function MenuManagement() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState("");

  // --- حالة التعديل (Edit) ---
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editImageError, setEditImageError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function load() {
    setLoading(true);
    getMenuItems()
      .then(setItems)
      .catch(setError)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  // تجميع الأصناف حسب الفئة — أسهل للمالك يلاقي صنف بدل قائمة مسطحة طويلة.
  const groupedByCategory = useMemo(() => {
    const groups = new Map();
    for (const item of items) {
      const key = item.category || "بدون فئة";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    return Array.from(groups.entries());
  }, [items]);

  function handleChange(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleImageChange(e) {
    setImageError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("الرجاء اختيار ملف صورة صالح.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setImageError(`حجم الصورة يجب ألا يتجاوز ${MAX_IMAGE_MB} ميغابايت.`);
      e.target.value = "";
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((f) => ({ ...f, imageUrl: dataUrl }));
    } catch {
      setImageError("تعذّر قراءة الصورة. حاول مرة أخرى.");
    }
  }

  function handleRemoveImage() {
    setForm((f) => ({ ...f, imageUrl: "" }));
    setImageError("");
  }

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await createMenuItem({ ...form, price: Number(form.price) });
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err);
    }
  }

  async function handleDelete(itemId) {
    try {
      await deleteMenuItem(itemId);
      load();
    } catch (err) {
      setError(err);
    }
  }

  // ---------- منطق التعديل ----------
  function startEdit(item) {
    setEditingId(item.id);
    setEditForm({
      name: item.name || "",
      price: item.price ?? "",
      category: item.category || "",
      description: item.description || "",
      imageUrl: item.imageUrl || "",
    });
    setEditImageError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
    setEditImageError("");
  }

  function handleEditChange(field) {
    return (e) => setEditForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleEditImageChange(e) {
    setEditImageError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setEditImageError("الرجاء اختيار ملف صورة صالح.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setEditImageError(`حجم الصورة يجب ألا يتجاوز ${MAX_IMAGE_MB} ميغابايت.`);
      e.target.value = "";
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setEditForm((f) => ({ ...f, imageUrl: dataUrl }));
    } catch {
      setEditImageError("تعذّر قراءة الصورة. حاول مرة أخرى.");
    }
  }

  function handleEditRemoveImage() {
    setEditForm((f) => ({ ...f, imageUrl: "" }));
    setEditImageError("");
  }

  async function handleSaveEdit(e, itemId) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await updateMenuItem(itemId, { ...editForm, price: Number(editForm.price) });
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
      <PageHeader title="القائمة" subtitle="أضف أصناف مطعمك، بصورة ووصف، وقسّمها حسب الفئة." />

      <Card as="form" onSubmit={handleAdd} className="mb-6 space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            placeholder="الاسم"
            value={form.name}
            onChange={handleChange("name")}
            required
            className={`${fieldClass} lg:col-span-2`}
          />
          <input
            type="number"
            step="0.01"
            placeholder="السعر"
            value={form.price}
            onChange={handleChange("price")}
            required
            className={fieldClass}
          />
          <input
            placeholder="الفئة"
            value={form.category}
            onChange={handleChange("category")}
            className={fieldClass}
          />
          <input
            placeholder="الوصف"
            value={form.description}
            onChange={handleChange("description")}
            className={`${fieldClass} lg:col-span-4`}
          />
        </div>

        {/* رفع صورة الصنف — معاينة فورية عبر FileReader (base64)، لحين توفر
            endpoint حقيقي لرفع الملفات من الـ backend. */}
        <div className="flex flex-wrap items-center gap-4 border-t border-ink/8 pt-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ink/25 bg-white/50 px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-copper hover:text-ink">
            <ImagePlus size={16} aria-hidden="true" />
            اختيار صورة للصنف
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>

          {form.imageUrl && (
            <div className="flex items-center gap-2">
              <img
                src={form.imageUrl}
                alt="معاينة صورة الصنف"
                className="h-14 w-14 rounded-lg border border-ink/10 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="flex items-center gap-1 text-sm font-medium text-brick hover:underline"
              >
                <X size={14} aria-hidden="true" />
                إزالة الصورة
              </button>
            </div>
          )}

          {imageError && <span className="text-xs text-brick">{imageError}</span>}

          <Button type="submit" className="mr-auto">
            <Plus size={16} />
            إضافة صنف
          </Button>
        </div>
      </Card>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-brick/10 px-3 py-2 text-sm text-brick">
          {error.message}
        </p>
      )}

      {loading ? (
        <Spinner label="جارِ تحميل القائمة…" />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={UtensilsCrossed} title="لا توجد أصناف بعد" description="أضف أول صنف من الفورم أعلاه." />
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedByCategory.map(([category, categoryItems]) => (
            <div key={category}>
              <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-soft/70">
                {category}
              </h2>
              <Card className="divide-y divide-ink/10 overflow-hidden">
                {categoryItems.map((item) => {
                  const isEditing = editingId === item.id;

                  if (isEditing) {
                    /* ---------- وضع التعديل ---------- */
                    return (
                      <form
                        key={item.id}
                        onSubmit={(e) => handleSaveEdit(e, item.id)}
                        className="space-y-3 px-4 py-4"
                      >
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <input
                            placeholder="الاسم"
                            value={editForm.name}
                            onChange={handleEditChange("name")}
                            required
                            autoFocus
                            className={`${fieldClass} lg:col-span-2`}
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="السعر"
                            value={editForm.price}
                            onChange={handleEditChange("price")}
                            required
                            className={fieldClass}
                          />
                          <input
                            placeholder="الفئة"
                            value={editForm.category}
                            onChange={handleEditChange("category")}
                            className={fieldClass}
                          />
                          <input
                            placeholder="الوصف"
                            value={editForm.description}
                            onChange={handleEditChange("description")}
                            className={`${fieldClass} lg:col-span-4`}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-4 border-t border-ink/8 pt-3">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ink/25 bg-white/50 px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-copper hover:text-ink">
                            <ImagePlus size={16} aria-hidden="true" />
                            تغيير الصورة
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleEditImageChange}
                              className="hidden"
                            />
                          </label>

                          {editForm.imageUrl && (
                            <div className="flex items-center gap-2">
                              <img
                                src={editForm.imageUrl}
                                alt="معاينة صورة الصنف"
                                className="h-12 w-12 rounded-lg border border-ink/10 object-cover"
                              />
                              <button
                                type="button"
                                onClick={handleEditRemoveImage}
                                className="flex items-center gap-1 text-sm font-medium text-brick hover:underline"
                              >
                                <X size={14} aria-hidden="true" />
                                إزالة
                              </button>
                            </div>
                          )}

                          {editImageError && <span className="text-xs text-brick">{editImageError}</span>}

                          <div className="mr-auto flex items-center gap-2">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={savingEdit}
                              className="flex items-center gap-1 text-sm text-ink-soft hover:opacity-75"
                            >
                              <X size={16} />
                              إلغاء
                            </button>
                            <Button type="submit" disabled={savingEdit}>
                              <Check size={16} />
                              {savingEdit ? "جارِ الحفظ…" : "حفظ"}
                            </Button>
                          </div>
                        </div>
                      </form>
                    );
                  }

                  /* ---------- وضع العرض ---------- */
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3 text-sm">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-11 w-11 shrink-0 rounded-lg border border-ink/10 object-cover"
                          />
                        ) : (
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-ink/15 text-ink-soft/50">
                            <UtensilsCrossed size={17} aria-hidden="true" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-medium text-ink">{item.name}</div>
                          {item.description && (
                            <div className="truncate text-xs text-ink-soft">{item.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <span className="text-sm font-medium text-copper-deep">{item.price}</span>
                        <button
                          onClick={() => startEdit(item)}
                          aria-label="تعديل الصنف"
                          className="text-ink-soft transition-colors hover:opacity-75"
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          aria-label="حذف الصنف"
                          className="text-brick transition-colors hover:text-brick/80"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}