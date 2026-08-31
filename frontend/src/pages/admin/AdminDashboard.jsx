/* ==========================================================================
   AdminDashboard.jsx — لوحة مسؤول المنصة (System Admin)
   --------------------------------------------------------------------------
   دور مستقل تمامًا عن owner: owner بيشوف مطعمه هو بس، admin بيشوف كل
   المطاعم (المستأجرين/tenants) المسجّلة على المنصة مجتمعين، مع القدرة على
   فرض تغيير باقة أي مطعم يدويًا (استخدام دعم فني، مش تدفق ترقية عادي).
   ========================================================================== */
import { useEffect, useState } from "react";
import { Building2, Crown, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { getAllRestaurants, overrideRestaurantPlan } from "../../api/admin";
import { getSubscriptionPlan, SUBSCRIPTION_PLANS } from "../../config/subscriptions";
import Spinner from "../../components/ui/Spinner";
import Card from "../../components/dashboard/Card";
import Badge from "../../components/ui/Badge";

const PLAN_BADGE_TONE = { basic: "neutral", pro: "warning", premium: "good" };

export default function AdminDashboard() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);

  function load() {
    setLoading(true);
    getAllRestaurants().then(setRestaurants).catch(setError).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleOverride(restaurant, planId) {
    if (planId === restaurant.plan) return;
    setSavingId(restaurant.id);
    try {
      await overrideRestaurantPlan(restaurant.id, planId);
      setRestaurants((prev) => prev.map((r) => (r.id === restaurant.id ? { ...r, plan: planId } : r)));
    } catch (err) {
      setError(err);
    } finally {
      setSavingId(null);
    }
  }

  const mrr = restaurants.reduce((sum, r) => sum + getSubscriptionPlan(r.plan).price, 0);
  const planCounts = Object.fromEntries(
    Object.keys(SUBSCRIPTION_PLANS).map((id) => [id, restaurants.filter((r) => r.plan === id).length])
  );

  return (
    <div dir="rtl" className="space-y-7">
      <header>
        <div className="flex items-center gap-2 text-copper">
          <ShieldCheck size={18} />
          <span className="text-sm font-black">لوحة مسؤول المنصة</span>
        </div>
        <h1 className="mt-2 text-3xl font-black">كل المطاعم المسجّلة</h1>
        <p className="mt-2 text-sm leading-7 text-ink-soft/60">نظرة عامة على كل المستأجرين (tenants) على المنصة، وإمكانية فرض تغيير باقة أي مطعم يدويًا.</p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl bg-brick/10 px-4 py-3 text-sm text-brick">{error.message}</p>
      )}

      {loading ? (
        <Spinner label="جارِ تحميل المطاعم…" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="flex items-center gap-4 p-5">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-copper/10 text-copper"><Building2 size={20} /></span>
              <div><p className="text-xs text-ink-soft/60">إجمالي المطاعم</p><strong className="text-2xl">{restaurants.length}</strong></div>
            </Card>
            <Card className="flex items-center gap-4 p-5">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-herb/10 text-herb"><Wallet size={20} /></span>
              <div><p className="text-xs text-ink-soft/60">إيراد شهري تقديري (MRR)</p><strong className="text-2xl">${mrr}</strong></div>
            </Card>
            <Card className="flex items-center gap-4 p-5">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-copper/10 text-copper"><Crown size={20} /></span>
              <div className="text-xs text-ink-soft/60">
                توزيع الباقات
                <div className="mt-1 flex gap-3 text-sm font-black text-ink">
                  {Object.entries(planCounts).map(([id, count]) => (
                    <span key={id}>{getSubscriptionPlan(id).name}: {count}</span>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-ink/10 px-5 py-4"><h2 className="font-black">المطاعم</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-right text-sm">
                <thead className="bg-ink/[0.03]">
                  <tr>
                    <th className="px-5 py-3 font-medium">المطعم</th>
                    <th className="px-5 py-3 font-medium">البريد الإلكتروني</th>
                    <th className="px-5 py-3 font-medium">الباقة</th>
                    <th className="px-5 py-3 font-medium">فرض تغيير الباقة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/8">
                  {restaurants.map((r) => (
                    <tr key={r.id} className="hover:bg-ink/[0.02]">
                      <td className="px-5 py-3 font-bold">{r.restaurantName}</td>
                      <td className="px-5 py-3 text-ink-soft">{r.email}</td>
                      <td className="px-5 py-3"><Badge tone={PLAN_BADGE_TONE[r.plan] || "neutral"}>{getSubscriptionPlan(r.plan).name}</Badge></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={r.plan}
                            disabled={savingId === r.id}
                            onChange={(e) => handleOverride(r, e.target.value)}
                            className="rounded-lg border border-ink/15 px-2.5 py-1.5 text-xs outline-none focus:border-copper"
                          >
                            {Object.values(SUBSCRIPTION_PLANS).map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          {savingId === r.id && <Loader2 size={14} className="animate-spin text-copper" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
