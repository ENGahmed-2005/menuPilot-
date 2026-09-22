import { useOutletContext } from "react-router-dom";
import { StatCard } from "./adminShared";
import { FileText } from "lucide-react";

const PLANS = ["Standard", "Pro", "Enterprise"];

export default function AdminSubscriptions() {
  const { restaurants } = useOutletContext();

  return (
    <>
      <section className="admin-heading">
        <div>
          <p className="admin-overline">إدارة الحسابات</p>
          <h1>الاشتراكات</h1>
          <p>باقة كل مطعم وحالة اشتراكه.</p>
        </div>
      </section>

      <section className="admin-stats-grid">
        {PLANS.map((plan) => (
          <StatCard
            key={plan}
            title={`باقة ${plan}`}
            value={`${restaurants.filter((r) => r.plan === plan).length} مطاعم`}
            icon={FileText}
            color="orange"
          />
        ))}
      </section>

      <section className="admin-table-card">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr><th>المطعم</th><th>المالك</th><th>الباقة الحالية</th><th>حالة الاشتراك</th></tr>
            </thead>
            <tbody>
              {restaurants.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.name}</strong></td>
                  <td>{r.owner}</td>
                  <td><span className="admin-plan">{r.plan}</span></td>
                  <td>
                    <span className={`admin-status ${r.active ? "active" : "inactive"}`}>
                      <i /> {r.active ? "فعّال" : "متوقف"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
