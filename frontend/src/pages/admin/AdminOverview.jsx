import { Link } from "react-router-dom";
import {
  Activity,
  Building2,
  CircleDollarSign,
  Store,
  Users,
} from "lucide-react";
import {
  StatCard,
  money,
  initialRestaurants,
} from "./AdminShared";

export default function AdminOverview({
  restaurants = initialRestaurants,
}) {
  const restaurantList = Array.isArray(restaurants)
    ? restaurants
    : initialRestaurants;

  const activeRestaurants = restaurantList.filter(
    (restaurant) => restaurant.active
  ).length;

  const totalTables = restaurantList.reduce(
    (sum, restaurant) =>
      sum + Number(restaurant.tables || 0),
    0
  );

  const totalRevenue = restaurantList.reduce(
    (sum, restaurant) =>
      sum + Number(restaurant.revenue || 0),
    0
  );

  const latestRestaurants = [...restaurantList]
    .slice(-5)
    .reverse();

  return (
    <>
      <section className="admin-heading">
        <div>
          <p className="admin-overline">
            <Activity size={14} />
            نظرة عامة لحظية
          </p>

          <h1>لوحة تحكم المسؤول العام</h1>

          <p>
            إدارة المطاعم والاشتراكات والأرباح من مكان واحد.
          </p>
        </div>

        <Link
          to="/admin/restaurants"
          className="admin-primary-button"
        >
          إضافة مطعم جديد
        </Link>
      </section>

      <section className="admin-stats-grid">
        <StatCard
          title="إجمالي المطاعم"
          value={restaurantList.length}
          icon={Building2}
          color="orange"
        />

        <StatCard
          title="المطاعم النشطة"
          value={activeRestaurants}
          icon={Store}
          color="blue"
        />

        <StatCard
          title="إجمالي الأرباح"
          value={money(totalRevenue)}
          icon={CircleDollarSign}
          color="green"
        />

        <StatCard
          title="الجلسات النشطة حاليًا"
          value={totalTables}
          icon={Users}
          color="purple"
        />
      </section>

      <section className="admin-table-card">
        <div className="admin-table-heading">
          <div>
            <p>آخر الإضافات</p>
            <h2>أحدث المطاعم المسجلة</h2>
          </div>

          <Link
            to="/admin/restaurants"
            className="admin-link-button"
          >
            عرض كل المطاعم
          </Link>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>اسم المطعم</th>
                <th>المالك</th>
                <th>الباقة</th>
                <th>الحالة</th>
              </tr>
            </thead>

            <tbody>
              {latestRestaurants.length > 0 ? (
                latestRestaurants.map((restaurant) => (
                  <tr key={restaurant.id}>
                    <td>
                      <strong>
                        {restaurant.name || "بدون اسم"}
                      </strong>
                    </td>

                    <td>
                      {restaurant.owner || "غير محدد"}
                    </td>

                    <td>
                      <span className="admin-plan">
                        {restaurant.plan || "غير محددة"}
                      </span>
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="admin-empty"
                  >
                    لا توجد مطاعم مسجلة حاليًا
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}