import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Search, X } from "lucide-react";

export default function AdminUsers() {
  const { users } = useOutletContext();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u) => `${u.name} ${u.email} ${u.role} ${u.restaurant}`.toLowerCase().includes(query));
  }, [users, search]);

  return (
    <>
      <section className="admin-heading">
        <div>
          <p className="admin-overline">إدارة الحسابات</p>
          <h1>المستخدمون</h1>
          <p>ملاك المطاعم والموظفون المسجلون على المنصة.</p>
        </div>
      </section>

      <section className="admin-table-card">
        <div className="admin-toolbar">
          <div className="admin-search">
            <Search size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو البريد أو المطعم..." />
            {search && <button onClick={() => setSearch("")}><X size={15} /></button>}
          </div>
          <span>عرض {filtered.length} من {users.length} مستخدمين</span>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr><th>الاسم</th><th>البريد الإلكتروني</th><th>الدور</th><th>المطعم</th><th>الحالة</th></tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td><span className="admin-plan">{u.role}</span></td>
                  <td>{u.restaurant}</td>
                  <td>
                    <span className={`admin-status ${u.active ? "active" : "inactive"}`}>
                      <i /> {u.active ? "نشط" : "موقوف"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="admin-empty">لا توجد نتائج مطابقة للبحث</div>}
        </div>
      </section>
    </>
  );
}