import { useEffect, useMemo, useState } from "react";
import { Pencil, RefreshCw, Search, UserRound, X } from "lucide-react";
import { api } from "../../api/client";
import AdminPageShell from "../../components/layout/AdminPageShell";

const emptyForm = {
  name: "",
  email: "",
  restaurant_name: "",
  restaurant_phone: "",
};

export default function OwnersManagement() {
  const [owners, setOwners] = useState([]);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const data = await api.get("/admin/restaurants");
      setOwners(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "تعذر تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return owners.filter((owner) =>
      `${owner.name || ""} ${owner.email || ""} ${
        owner.restaurant_name || ""
      }`
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [owners, query]);

  function openEdit(owner) {
    setSuccess("");
    setError("");
    setForm({
      name: owner.name || "",
      email: owner.email || "",
      restaurant_name: owner.restaurant_name || "",
      restaurant_phone: owner.restaurant_phone || "",
    });
    setModal(owner);
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setForm(emptyForm);
  }

  async function save(event) {
    event.preventDefault();

    if (!modal) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await api.patch(`/admin/owners/${modal.id}`, form);

      setOwners((current) =>
        current.map((owner) =>
          owner.id === modal.id ? { ...owner, ...updated } : owner
        )
      );

      setModal(null);
      setForm(emptyForm);
      setSuccess("تم حفظ بيانات المستخدم والمطعم.");
    } catch (e) {
      setError(e.message || "تعذر حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminPageShell title="المستخدمون">
      <section className="admin-heading">
        <div>
          <p className="admin-overline">
            <UserRound size={14} />
            إدارة الحسابات
          </p>

          <h1>المستخدمون</h1>
          <p>إدارة أصحاب المطاعم وبيانات حساباتهم مباشرة من بيانات المنصة.</p>
        </div>

        <button
          className="admin-primary-button"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw
            size={15}
            className={loading ? "animate-spin" : ""}
          />
          تحديث
        </button>
      </section>

      {error && (
        <div
          style={{
            marginBottom: 14,
            padding: 12,
            borderRadius: 10,
            background: "#fff0eb",
            color: "#bd725c",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            marginBottom: 14,
            padding: 12,
            borderRadius: 10,
            background: "#f1fbf4",
            color: "#3e9b75",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {success}
        </div>
      )}

      <section className="admin-table-card">
        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث بالاسم أو البريد أو المطعم..."
            />
          </div>

          <span>
            {filtered.length} مستخدم من أصل {owners.length}
          </span>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>المطعم</th>
                <th>الهاتف</th>
                <th>الباقة</th>
                <th>إجراء</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((owner) => (
                <tr key={owner.id}>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span
                        className="admin-stat-icon orange"
                        style={{ width: 34, height: 34 }}
                      >
                        <UserRound size={16} />
                      </span>

                      <div>
                        <strong>{owner.name || "بدون اسم"}</strong>
                        <small
                          style={{
                            display: "block",
                            marginTop: 3,
                            color: "#999",
                          }}
                        >
                          {owner.email || "بدون بريد إلكتروني"}
                        </small>
                      </div>
                    </div>
                  </td>

                  <td>{owner.restaurant_name || "—"}</td>
                  <td>{owner.restaurant_phone || "—"}</td>
                  <td>
                    <span className="admin-plan">
                      {owner.plan || "—"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="admin-edit"
                      onClick={() => openEdit(owner)}
                    >
                      <Pencil size={14} />
                      تعديل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="admin-empty">جارٍ تحميل المستخدمين...</div>
          )}

          {!loading && !filtered.length && (
            <div className="admin-empty">لا توجد نتائج مطابقة.</div>
          )}
        </div>
      </section>

      {modal && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <form className="admin-modal" onSubmit={save}>
            <div className="admin-modal-header">
              <div>
                <small>تعديل الحساب</small>
                <h2>بيانات المستخدم والمطعم</h2>
              </div>

              <button type="button" onClick={closeModal}>
                <X size={19} />
              </button>
            </div>

            <div
              className="admin-modal form"
              style={{ padding: "20px 24px 24px" }}
            >
              <label>
                اسم المستخدم
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </label>

              <label>
                البريد الإلكتروني
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </label>

              <label>
                اسم المطعم
                <input
                  value={form.restaurant_name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      restaurant_name: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                هاتف المطعم
                <input
                  value={form.restaurant_phone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      restaurant_phone: event.target.value,
                    })
                  }
                />
              </label>

              <div className="admin-modal-actions">
                <button type="button" onClick={closeModal}>
                  إلغاء
                </button>

                <button type="submit" disabled={saving}>
                  {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </AdminPageShell>
  );
}
