import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCheck, Clock3, RefreshCw } from "lucide-react";
import { api } from "../../api/client";
import AdminPageShell from "./AdminPageShell";

export default function AdminNotifications() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [read, setRead] = useState(
    () => localStorage.getItem("menupilot_admin_notifications_read") === "1"
  );

  async function loadNotifications() {
    setLoading(true);
    setError("");

    try {
      const data = await api.get("/admin/restaurants");
      setRestaurants(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "تعذر تحميل الإشعارات.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  const alerts = useMemo(() => {
    const now = Date.now();

    return restaurants.flatMap((restaurant) => {
      const items = [];

      if (restaurant.plan === "trial" && restaurant.trial_ends_at) {
        const days = Math.ceil(
          (new Date(restaurant.trial_ends_at).getTime() - now) / 86400000
        );

        if (days <= 3) {
          items.push({
            id: `trial-${restaurant.id}`,
            title: days < 0 ? "انتهت التجربة المجانية" : "التجربة المجانية تقترب من الانتهاء",
            text: `${restaurant.restaurant_name || "مطعم بدون اسم"} — ${
              days < 0
                ? `انتهت منذ ${Math.abs(days)} يوم`
                : `متبقي ${days} يوم`
            }`,
          });
        }
      }

      if (
        restaurant.subscription_ends_at &&
        new Date(restaurant.subscription_ends_at).getTime() <= now
      ) {
        items.push({
          id: `subscription-${restaurant.id}`,
          title: "اشتراك منتهٍ",
          text: `${restaurant.restaurant_name || "مطعم بدون اسم"} يحتاج متابعة الاشتراك.`,
        });
      }

      return items;
    });
  }, [restaurants]);

  function markAsRead() {
    localStorage.setItem("menupilot_admin_notifications_read", "1");
    setRead(true);
  }

  return (
    <AdminPageShell title="الإشعارات">
      <section className="admin-heading">
        <div>
          <p className="admin-overline">
            <Bell size={14} /> مركز المتابعة
          </p>
          <h1>الإشعارات</h1>
          <p>تنبيهات مبنية على بيانات المطاعم والاشتراكات.</p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="admin-primary-button"
            onClick={loadNotifications}
            disabled={loading}
          >
            <RefreshCw size={15} />
            {loading ? "جارٍ التحديث..." : "تحديث"}
          </button>

          <button className="admin-edit" onClick={markAsRead}>
            <CheckCheck size={15} /> تحديد كمقروء
          </button>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
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

      <section className="admin-table-card">
        <div className="admin-table-heading">
          <div>
            <p>{alerts.length} تنبيه</p>
            <h2>آخر التنبيهات</h2>
          </div>
          <span className="admin-live">
            <i /> متصل بالباكند
          </span>
        </div>

        {loading ? (
          <div className="admin-empty">جارٍ فحص بيانات الاشتراكات...</div>
        ) : alerts.length > 0 ? (
          <div style={{ padding: "8px 24px 24px", display: "grid", gap: 10 }}>
            {alerts.map((alert) => (
              <article
                key={alert.id}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  padding: 16,
                  borderRadius: 14,
                  background: read ? "#faf9f6" : "#fff8f2",
                  border: "1px solid #eee9df",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    background: "#fff0eb",
                    color: "#bd725c",
                  }}
                >
                  <AlertTriangle size={18} />
                </div>

                <div>
                  <strong>{alert.title}</strong>
                  <p style={{ margin: "5px 0 0", color: "#85867d", fontSize: 11 }}>
                    {alert.text}
                  </p>
                  <small
                    style={{
                      display: "flex",
                      gap: 5,
                      alignItems: "center",
                      marginTop: 7,
                      color: "#aaa99f",
                    }}
                  >
                    <Clock3 size={12} /> الآن
                  </small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty">لا توجد تنبيهات حاليًا.</div>
        )}
      </section>
    </AdminPageShell>
  );
}