import { useState } from "react";
import { Check, Crown, Loader2, Lock, Palette, ArrowUpRight } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getSubscriptionPlan, hasPlanFeature, SUBSCRIPTION_PLANS } from "../../config/subscriptions";
import { useAuth } from "../../context/AuthContext";
import { changePlan } from "../../api/subscription";

const labels = {
  dashboard: "لوحة التحكم", tables: "إدارة الطاولات", menu: "إدارة القائمة", orders: "الطلبات",
  reports: "التقارير", kitchen: "لوحة المطبخ", cashier: "الكاشير والفواتير", waiter: "لوحة النادل",
  "advanced-reports": "التقارير المتقدمة", analytics: "التحليلات", "priority-support": "دعم أولوية",
  "theme-presets": "ثيمات جاهزة", "custom-theme": "تخصيص الثيم بالكامل",
};

export default function SubscriptionPlanPage() {
  const { planId = "pro" } = useParams();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const plan = getSubscriptionPlan(planId);
  const current = getSubscriptionPlan(user?.plan);
  const isCurrentPlan = user?.plan === planId;
  const features = Object.keys(labels);
  const [switching, setSwitching] = useState(false);

  // مو حقيقي دفع فعلي طبعًا (بيئة Mock) — بس بيبدّل باقة الحساب فورًا عشان
  // تقدر تجرّب اختلاف اللوحة والمزايا المتاحة بين الباقات مباشرة.
  async function handleSwitchPlan() {
    setSwitching(true);
    try {
      const updated = await changePlan(planId);
      updateUser(updated);
      navigate("/owner/dashboard");
    } finally {
      setSwitching(false);
    }
  }

  return <div dir="rtl" className="space-y-8">
    <section className="overflow-hidden rounded-[2rem] bg-ink p-7 text-paper shadow-xl sm:p-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-copper/15 px-3 py-1 text-xs font-black text-copper"><Crown size={14}/> باقة {plan.name}</span>
          <h1 className="mt-4 text-4xl font-black">{plan.name}</h1>
          <p className="mt-3 max-w-2xl leading-7 text-paper/55">{plan.description}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="text-left"><strong className="text-5xl font-black text-copper">${plan.price}</strong><span className="text-sm text-paper/45"> / شهر</span></div>
          {isCurrentPlan ? (
            <span className="flex items-center gap-2 rounded-full bg-herb/15 px-4 py-2 text-xs font-black text-herb"><Check size={14}/> باقتك الحالية</span>
          ) : (
            <button
              type="button"
              onClick={handleSwitchPlan}
              disabled={switching}
              className="flex items-center gap-2 rounded-full bg-copper px-5 py-3 text-sm font-black text-ink transition hover:bg-copper-deep disabled:cursor-wait disabled:opacity-60"
            >
              {switching ? <Loader2 size={16} className="animate-spin"/> : <ArrowUpRight size={16}/>}
              {switching ? "جارٍ التبديل..." : `التبديل إلى ${plan.name}`}
            </button>
          )}
        </div>
      </div>
    </section>

    <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => {
        const enabled = hasPlanFeature(planId, feature);
        return <div key={feature} className={`rounded-3xl border p-5 ${enabled ? "border-herb/20 bg-paper" : "border-ink/8 bg-paper-2 opacity-60"}`}>
          <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-2xl ${enabled ? "bg-herb/10 text-herb" : "bg-ink/5 text-ink-soft/50"}`}>{enabled ? <Check size={19}/> : <Lock size={17}/>}</span><span className="font-bold">{labels[feature]}</span></div><span className="text-xs font-bold">{enabled ? "متاح" : "ترقية"}</span></div>
        </div>;
      })}
    </section>

    <section className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-3xl border border-ink/8 bg-paper p-6"><div className="flex items-center gap-3"><Palette className="text-copper"/><h2 className="text-xl font-black">تخصيص المظهر</h2></div><p className="mt-3 text-sm leading-7 text-ink-soft/60">الأساسية تستخدم الهوية الافتراضية. الاحترافية تحصل على ثيمات جاهزة، والمميزة تستطيع بناء ألوانها الخاصة.</p><Link to="/owner/theme" className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-black text-paper">إدارة الثيم <ArrowUpRight size={16}/></Link></div>
      <div className="rounded-3xl bg-copper p-6 text-ink"><p className="text-xs font-black">اشتراكك الحالي</p><h2 className="mt-2 text-3xl font-black">{current.name}</h2><p className="mt-2 text-sm opacity-70">يمكنك مقارنة الباقات من هذه الصفحة قبل الترقية.</p></div>
    </section>

    <div className="grid gap-4 md:grid-cols-3">{Object.values(SUBSCRIPTION_PLANS).map((item) => <Link key={item.id} to={`/owner/subscription/${item.id}`} className={`rounded-2xl border p-4 transition hover:-translate-y-1 ${item.id === planId ? "border-copper bg-copper/10" : "border-ink/8 bg-paper"}`}><span className="text-xs text-ink-soft/55">باقة</span><div className="mt-1 font-black">{item.name}</div><div className="mt-2 font-black">${item.price}<span className="text-xs font-normal"> / شهر</span></div>{item.id === user?.plan && <span className="mt-2 block text-[10px] font-black text-copper">باقتك الحالية</span>}</Link>)}</div>
  </div>;
}
