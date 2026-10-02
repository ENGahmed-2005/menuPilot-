/* ==========================================================================
   MenuManagement.jsx — إدارة أصناف القائمة
   يغطي: FR-08 (إضافة), FR-09 (تعديل), FR-10 (حذف)
   ========================================================================== */
import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Pencil, Plus, Trash2, UtensilsCrossed, X, Check, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { createMenuItem, deleteMenuItem, getMenuItems, updateMenuItem } from "../../api/menu";
import { useAuth } from "../../context/AuthContext";
import { getSubscriptionPlan, subscriptionOf } from "../../config/subscriptions";
import Input from "../../components/ui/Input";
import Alert from "../../components/ui/Alert";
import { SkeletonCards } from "../../components/ui/Skeleton";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import { useSubscription } from "../../hooks/useSubscription";
import { errorText } from "../../utils/errors";
import { money } from "../../utils/format";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/dashboard/PageHeader";
import Card from "../../components/dashboard/Card";
import EmptyState from "../../components/dashboard/EmptyState";
import { t } from "../../i18n";

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
  const [confirm, confirmDialog] = useConfirm();
  const [adding, setAdding] = useState(false);
  const { canOperate } = useSubscription();
  const [notice, setNotice] = useState("");
  const { user } = useAuth();
  const plan = getSubscriptionPlan(subscriptionOf(user).plan);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState("");

  const atLimit = items.length >= plan.limits.menuItems;

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
      const key = item.category || t("بدون فئة");
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
      setImageError(t("الرجاء اختيار ملف صورة صالح."));
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setImageError(t("حجم الصورة يجب ألا يتجاوز {0} ميغابايت.", { 0: MAX_IMAGE_MB }));
      e.target.value = "";
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((f) => ({ ...f, imageUrl: dataUrl }));
    } catch {
      setImageError(t("تعذّر قراءة الصورة. حاول مرة أخرى."));
    }
  }

  function handleRemoveImage() {
    setForm((f) => ({ ...f, imageUrl: "" }));
    setImageError("");
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (adding) return;
    setAdding(true);
    setError(null);
    try {
      await createMenuItem({ ...form, price: Number(form.price) });
      setNotice(t("أُضيف «{0}» إلى المنيو.", { 0: form.name.trim() }));
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err); // the form keeps what the owner typed
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(itemId) {
    const item = items.find((x) => x.id === itemId);
    const ok = await confirm({
      title: t("حذف «{0}» من المنيو؟", { 0: item?.name ?? "الصنف" }),
      description: t("لن يظهر الصنف للزبائن بعد الآن. الطلبات السابقة التي تحتويه تبقى في السجل."),
      confirmLabel: t("حذف الصنف"),
      tone: "danger",
    });
    if (!ok) return;
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
      setEditImageError(t("الرجاء اختيار ملف صورة صالح."));
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setEditImageError(t("حجم الصورة يجب ألا يتجاوز {0} ميغابايت.", { 0: MAX_IMAGE_MB }));
      e.target.value = "";
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setEditForm((f) => ({ ...f, imageUrl: dataUrl }));
    } catch {
      setEditImageError(t("تعذّر قراءة الصورة. حاول مرة أخرى."));
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
      <PageHeader
        title={t("القائمة")}
        subtitle={t("أضف أصناف مطعمك، بصورة ووصف، وقسّمها حسب الفئة. ({0} من {1} — باقة {2})", { 0: items.length, 1: plan.limits.menuItems === Infinity ? "∞" : plan.limits.menuItems, 2: plan.name })}
      />

      {atLimit && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-copper/25 bg-copper/5 p-4 text-sm">
          <span className="flex items-center gap-2 font-medium text-copper-ink">
            <Crown size={16} /> {t("وصلت للحد الأقصى لعدد الأصناف في باقة")} {plan.name}.
          </span>
          <Link to="/owner/subscription/pro" className="font-bold text-copper-ink hover:underline">
            {t("رقّي باقتك →")}
          </Link>
        </Card>
      )}

      <Card as="form" onSubmit={handleAdd} className="mb-6 space-y-4 p-4 sm:p-5">
        <h2 className="text-base font-extrabold text-ink">{t("إضافة صنف جديد")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Input label={t("اسم الصنف")} required maxLength={120} value={form.name} onChange={handleChange("name")} placeholder={t("مثل: شاورما دجاج")} />
          </div>
          <Input label={t("السعر (₪)")} type="number" inputMode="decimal" step="0.01" min="0.01" required value={form.price} onChange={handleChange("price")} placeholder="0.00" />
          <Input label={t("التصنيف")} list="menu-categories" value={form.category} onChange={handleChange("category")} placeholder={t("مثل: مشروبات")} hint={t("اختر تصنيفًا موجودًا أو اكتب جديدًا.")} />
          <datalist id="menu-categories">
            {[...new Set(items.map((x) => x.category).filter(Boolean))].map((c) => <option key={c} value={c} />)}
          </datalist>
          <div className="sm:col-span-2 lg:col-span-4">
            <Input label={t("الوصف")} maxLength={300} value={form.description} onChange={handleChange("description")} placeholder={t("المكونات أو طريقة التحضير، في سطر واحد")} />
          </div>
        </div>

        {/* رفع صورة الصنف — معاينة فورية عبر FileReader (base64)، لحين توفر
            endpoint حقيقي لرفع الملفات من الـ backend. */}
        <div className="flex flex-wrap items-center gap-4 border-t border-ink/8 pt-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ink/25 bg-white/50 px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-copper hover:text-ink">
            <ImagePlus size={16} aria-hidden="true" />
            {t("اختيار صورة للصنف")}
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>

          {form.imageUrl && (
            <div className="flex items-center gap-2">
              <img
                src={form.imageUrl}
                alt={t("معاينة صورة الصنف")}
                className="h-14 w-14 rounded-lg border border-ink/10 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="flex items-center gap-1 text-sm font-medium text-brick hover:underline"
              >
                <X size={14} aria-hidden="true" />
                {t("إزالة الصورة")}
              </button>
            </div>
          )}

          {imageError && <span className="text-xs text-brick">{imageError}</span>}

          <Button type="submit" disabled={atLimit || !canOperate} loading={adding} className="mr-auto">
            {!adding && <Plus size={16} aria-hidden="true" />}
            {t("إضافة الصنف")}
          </Button>
        </div>
      </Card>

      {confirmDialog}
      {notice && <Alert tone="success" className="mb-4" onDismiss={() => setNotice("")}>{notice}</Alert>}
      {error && <Alert tone="danger" className="mb-4" onDismiss={() => setError(null)}>{errorText(error, t("تعذّر حفظ التغيير."))}</Alert>}

      {loading ? (
        <SkeletonCards count={4} className="space-y-3" cardClassName="h-20" label={t("جارِ تحميل المنيو…")} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={UtensilsCrossed} title={t("المنيو فارغ")} description={t("أضف أول صنف من النموذج أعلاه، وسيظهر للزبائن فور حفظه.")} />
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedByCategory.map(([category, categoryItems]) => (
            <div key={category}>
              <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
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
                            placeholder={t("الاسم")}
                            aria-label={t("الاسم")}
                            value={editForm.name}
                            onChange={handleEditChange("name")}
                            required
                            autoFocus
                            className={`${fieldClass} lg:col-span-2`}
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder={t("السعر")}
                            aria-label={t("السعر")}
                            value={editForm.price}
                            onChange={handleEditChange("price")}
                            required
                            className={fieldClass}
                          />
                          <input
                            placeholder={t("الفئة")}
                            aria-label={t("الفئة")}
                            value={editForm.category}
                            onChange={handleEditChange("category")}
                            className={fieldClass}
                          />
                          <input
                            placeholder={t("الوصف")}
                            aria-label={t("الوصف")}
                            value={editForm.description}
                            onChange={handleEditChange("description")}
                            className={`${fieldClass} lg:col-span-4`}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-4 border-t border-ink/8 pt-3">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ink/25 bg-white/50 px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-copper hover:text-ink">
                            <ImagePlus size={16} aria-hidden="true" />
                            {t("تغيير الصورة")}
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
                                alt={t("معاينة صورة الصنف")}
                                className="h-12 w-12 rounded-lg border border-ink/10 object-cover"
                              />
                              <button
                                type="button"
                                onClick={handleEditRemoveImage}
                                className="flex items-center gap-1 text-sm font-medium text-brick hover:underline"
                              >
                                <X size={14} aria-hidden="true" />
                                {t("إزالة")}
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
                              {t("إلغاء")}
                            </button>
                            <Button type="submit" disabled={savingEdit}>
                              <Check size={16} />
                              {savingEdit ? t("جارِ الحفظ…") : t("حفظ")}
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
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-ink/15 text-muted">
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
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="num ml-2 text-sm font-bold text-ink">{money(item.price)}</span>
                        <button
                          onClick={() => startEdit(item)}
                          aria-label={t("تعديل {0}", { 0: item.name })}
                          className="grid h-10 w-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-ink/[0.06] hover:text-ink"
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          aria-label={t("حذف {0}", { 0: item.name })}
                          className="grid h-10 w-10 place-items-center rounded-xl text-brick transition-colors hover:bg-brick/10"
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