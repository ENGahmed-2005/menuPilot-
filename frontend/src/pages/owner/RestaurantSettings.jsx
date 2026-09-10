import { Link } from "react-router-dom";
import { Building2, ChevronLeft, Mail, Palette, Crown, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getSubscriptionPlan } from "../../config/subscriptions";
import Card from "../../components/dashboard/Card";
import PageHeader from "../../components/dashboard/PageHeader";

export default function RestaurantSettings() {
  const { user } = useAuth();
  const plan = getSubscriptionPlan(user?.plan);

  return (
    <div dir="rtl" className="space-y-7">
      <PageHeader
        title="إعدادات المطعم"
        subtitle="إدارة معلومات حساب المطعم، الاشتراك، وهوية لوحة التحكم من مكان واحد."
      />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <Card className="overflow-hidden p-0">
          <div className="bg-ink p-6 text-paper sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-copper/15 px-3 py-1 text-xs font-black text-copper">
                  <Building2 size={14} /> ملف المطعم
                </span>
                <h2 className="mt-4 text-2xl font-black">{user?.restaurantName || user?.name || "مطعمي"}</h2>
                <p className="mt-2 text-sm text-paper/55">بيانات الحساب المرتبط بهذا المطعم.</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-copper text-ink">
                <Building2 size={22} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
            <div className="rounded-2xl border border-ink/8 bg-paper-2 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-ink-soft/55"><Building2 size={15} /> اسم المطعم</div>
              <p className="mt-2 font-black">{user?.restaurantName || "غير محدد"}</p>
            </div>
            <div className="rounded-2xl border border-ink/8 bg-paper-2 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-ink-soft/55"><Mail size={15} /> البريد الإلكتروني</div>
              <p className="mt-2 break-all font-black">{user?.email || "غير محدد"}</p>
            </div>
            <div className="rounded-2xl border border-ink/8 bg-paper-2 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-ink-soft/55"><ShieldCheck size={15} /> نوع الحساب</div>
              <p className="mt-2 font-black">مالك المطعم</p>
            </div>
            <div className="rounded-2xl border border-ink/8 bg-paper-2 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-ink-soft/55"><Crown size={15} /> الباقة الحالية</div>
              <p className="mt-2 font-black">{plan.name}</p>
            </div>
          </div>

          <div className="border-t border-ink/8 px-6 py-5 text-xs leading-6 text-ink-soft/55 sm:px-8">
            بيانات الملف الأساسية تُعرض من الحساب المسجّل حاليًا. تغيير الباقة والثيم متاحان مباشرة من الإعدادات التالية، بينما تعديل بيانات المطعم الدائمة يحتاج endpoint مخصص من الـ backend.
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-copper/10 text-copper"><Crown size={19} /></span>
              <div><h2 className="font-black">الاشتراك</h2><p className="text-xs text-ink-soft/55">{plan.name} · ${plan.price} / شهر</p></div>
            </div>
            <Link to={`/owner/subscription/${plan.id}`} className="mt-5 flex items-center justify-between rounded-2xl bg-ink px-4 py-3 text-sm font-black text-paper">
              مقارنة وإدارة الباقة <ChevronLeft size={16} />
            </Link>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-copper/10 text-copper"><Palette size={19} /></span>
              <div><h2 className="font-black">هوية لوحة التحكم</h2><p className="text-xs text-ink-soft/55">الثيم والألوان حسب باقتك.</p></div>
            </div>
            <Link to="/owner/theme" className="mt-5 flex items-center justify-between rounded-2xl bg-copper px-4 py-3 text-sm font-black text-ink">
              تخصيص المظهر <ChevronLeft size={16} />
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
