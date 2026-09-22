import { useMemo, useState } from "react";
import {
  Check,
  Pencil,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from "lucide-react";
import AdminPageShell from "./AdminPageShell";
import { initialRestaurants, money } from "./AdminShared";

const emptyForm = {
  name: "",
  owner: "",
  plan: "Pro",
  tables: 10,
  revenue: 0,
};

export default function AdminRestaurants() {
  const [restaurants, setRestaurants] = useState(initialRestaurants);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const filteredRestaurants = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return restaurants;
    }

    return restaurants.filter((restaurant) =>
      `${restaurant.name || ""} ${restaurant.owner || ""} ${
        restaurant.plan || ""
      }`
        .toLowerCase()
        .includes(query)
    );
  }, [restaurants, search]);

  function openAddModal() {
    setEditing(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  }

  function openEditModal(restaurant) {
    setEditing(restaurant);
    setForm({
      name: restaurant.name || "",
      owner: restaurant.owner || "",
      plan: restaurant.plan || "Pro",
      tables: restaurant.tables || 10,
      revenue: restaurant.revenue || 0,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm({ ...emptyForm });
  }

  function saveRestaurant(event) {
    event.preventDefault();

    if (!form.name.trim() || !form.owner.trim()) {
      window.alert("يرجى إدخال اسم المطعم واسم المالك");
      return;
    }

    const data = {
      name: form.name.trim(),
      owner: form.owner.trim(),
      plan: form.plan,
      tables: Number(form.tables) || 0,
      revenue: Number(form.revenue) || 0,
    };

    if (editing) {
      setRestaurants((current) =>
        current.map((restaurant) =>
          restaurant.id === editing.id
            ? { ...restaurant, ...data }
            : restaurant
        )
      );
    } else {
      setRestaurants((current) => [
        ...current,
        {
          id: Date.now(),
          ...data,
          active: true,
        },
      ]);
    }

    closeModal();
  }

  function toggleRestaurant(id) {
    setRestaurants((current) =>
      current.map((restaurant) =>
        restaurant.id === id
          ? {
              ...restaurant,
              active: !restaurant.active,
            }
          : restaurant
      )
    );
  }

  function deleteRestaurant(restaurant) {
    const confirmed = window.confirm(
      `هل تريدين حذف المطعم "${restaurant.name}"؟`
    );

    if (!confirmed) {
      return;
    }

    setRestaurants((current) =>
      current.filter((item) => item.id !== restaurant.id)
    );
  }

  return (
    <AdminPageShell title="المطاعم">
      <section className="admin-heading">
        <div>
          <p className="admin-overline">
            إدارة الحسابات
          </p>

          <h1>المطاعم</h1>

          <p>كل المطاعم المسجلة على المنصة.</p>
        </div>

        <button
          type="button"
          className="admin-primary-button"
          onClick={openAddModal}
        >
          <Plus size={18} />
          إضافة مطعم جديد
        </button>
      </section>

      <section className="admin-table-card">
        <div className="admin-table-heading">
          <div>
            <p>إدارة الحسابات</p>
            <h2>قائمة المطاعم المسجلة</h2>
          </div>

          <span className="admin-live">
            <i />
            البيانات محدثة الآن
          </span>
        </div>

        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={18} />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم المطعم أو المالك..."
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="مسح البحث"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <span>
            عرض {filteredRestaurants.length} من{" "}
            {restaurants.length} مطاعم
          </span>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>اسم المطعم</th>
                <th>المالك</th>
                <th>الباقة</th>
                <th>عدد الطاولات</th>
                <th>إجمالي الإيرادات</th>
                <th>الحالة</th>
                <th>إجراءات التحكم</th>
              </tr>
            </thead>

            <tbody>
              {filteredRestaurants.map((restaurant) => (
                <tr key={restaurant.id}>
                  <td>
                    <strong>
                      {restaurant.name || "بدون اسم"}
                    </strong>
                  </td>

                  <td>{restaurant.owner || "غير محدد"}</td>

                  <td>
                    <span className="admin-plan">
                      {restaurant.plan || "غير محددة"}
                    </span>
                  </td>

                  <td>
                    {restaurant.tables || 0} طاولات
                  </td>

                  <td className="admin-revenue">
                    {money(restaurant.revenue)}
                  </td>

                  <td>
                    <span
                      className={`admin-status ${
                        restaurant.active
                          ? "active"
                          : "inactive"
                      }`}
                    >
                      <i />
                      {restaurant.active
                        ? "نشط"
                        : "قيد الإيقاف"}
                    </span>
                  </td>

                  <td>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-edit"
                        onClick={() =>
                          openEditModal(restaurant)
                        }
                      >
                        <Pencil size={14} />
                        تعديل
                      </button>

                      <button
                        type="button"
                        className={
                          restaurant.active
                            ? "admin-disable"
                            : "admin-enable"
                        }
                        onClick={() =>
                          toggleRestaurant(restaurant.id)
                        }
                      >
                        {restaurant.active ? (
                          <ToggleLeft size={15} />
                        ) : (
                          <ToggleRight size={15} />
                        )}

                        {restaurant.active
                          ? "تعطيل"
                          : "تفعيل"}
                      </button>

                      <button
                        type="button"
                        className="admin-disable"
                        onClick={() =>
                          deleteRestaurant(restaurant)
                        }
                      >
                        <Trash2 size={14} />
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRestaurants.length === 0 && (
            <div className="admin-empty">
              لا توجد نتائج مطابقة للبحث
            </div>
          )}
        </div>
      </section>

      {modalOpen && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="admin-modal">
            <div className="admin-modal-header">
              <div>
                <small>إدارة المطاعم</small>

                <h2>
                  {editing
                    ? "تعديل المطعم"
                    : "إضافة مطعم جديد"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="إغلاق"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={saveRestaurant}>
              <label>
                اسم المطعم

                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  placeholder="مثال: مطعم الشذا"
                />
              </label>

              <label>
                اسم المالك

                <input
                  required
                  value={form.owner}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      owner: event.target.value,
                    })
                  }
                  placeholder="مثال: أحمد محمود"
                />
              </label>

              <div className="admin-form-row">
                <label>
                  الباقة

                  <select
                    value={form.plan}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        plan: event.target.value,
                      })
                    }
                  >
                    <option value="Pro">Pro</option>
                    <option value="Standard">
                      Standard
                    </option>
                    <option value="Enterprise">
                      Enterprise
                    </option>
                  </select>
                </label>

                <label>
                  عدد الطاولات

                  <input
                    type="number"
                    min="1"
                    value={form.tables}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        tables: event.target.value,
                      })
                    }
                  />
                </label>
              </div>

              <label>
                الإيرادات الشهرية

                <input
                  type="number"
                  min="0"
                  value={form.revenue}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      revenue: event.target.value,
                    })
                  }
                />
              </label>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  onClick={closeModal}
                >
                  إلغاء
                </button>

                <button type="submit">
                  <Check size={16} />
                  حفظ المطعم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}