/* TryDemo.jsx — try menuPilot without signing up: a live demo restaurant
   (orders in the kitchen, busy tables, months of sales), as the owner, the
   kitchen, the cashier or a guest. Rebuilt every day (DemoRestaurant). */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChefHat, Loader2, Receipt, Smartphone, Store } from "lucide-react";
import Reveal from "./Reveal";
import { useAuth } from "../../../context/AuthContext";
import { demoGuestTable } from "../../../api/demo";
import { t } from "../../../i18n";

const ROLES = [
  { id: "owner", icon: Store, to: "/owner/dashboard", cta: t("جرّب كصاحب المطعم"), text: t("لوحة التحكم والتقارير والأرباح والرواتب.") },
  { id: "kitchen", icon: ChefHat, to: "/kitchen", cta: t("جرّب شاشة المطبخ"), text: t("طلبات حية بكل مراحلها، ووضع شاشة الحائط.") },
  { id: "cashier", icon: Receipt, to: "/cashier/tables", cta: t("جرّب ككاشير"), text: t("الطاولات المشغولة والفواتير والدفع.") },
  { id: "guest", icon: Smartphone, to: null, cta: t("جرّب كزبون"), text: t("افتح منيو الطاولة، واطلب، وتابع طلبك.") },
];

export default function TryDemo() {
  const { startDemo } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  // Get the demo ready in the background once the page is idle: the first
  // visit of the day rebuilds it (a few seconds), so the click is instant.
  const guestTable = useRef(null);
  useEffect(() => {
    const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1500));
    const id = idle(() => { guestTable.current = demoGuestTable().then((d) => d?.table_code).catch(() => null); });
    return () => (window.cancelIdleCallback || clearTimeout)(id);
  }, []);

  async function open(role) {
    setBusy(role.id);
    setError("");
    try {
      if (role.id === "guest") {
        const code = (await guestTable.current) || (await demoGuestTable()).table_code;
        navigate(`/t/${code}`);
        return;
      }
      await startDemo(role.id);
      navigate(role.to);
    } catch (err) {
      setError(err?.message || t("تعذّر فتح المطعم التجريبي. حاول مرة أخرى."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section id="demo" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
      <Reveal className="rounded-3xl border border-[#EEA122]/30 bg-[#EEA122]/[.06] p-6 sm:p-10">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t("جرّبه الآن، دون تسجيل.")}</h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#F3EFE5]/75">{t("مطعم تجريبي حي فيه طلبات وطاولات ومبيعات أشهر. اختر من تريد أن تكون. تُعاد بياناته كل يوم.")}</p>
        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {ROLES.map((role) => {
            const Icon = role.icon;
            const loading = busy === role.id;
            return (
              <button key={role.id} type="button" onClick={() => open(role)} disabled={Boolean(busy)}
                className="group flex min-h-11 flex-col items-start rounded-2xl border border-[#F3EFE5]/12 bg-[#0d1620] p-4 text-start transition-colors hover:border-[#EEA122]/60 disabled:opacity-60 sm:p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEA122]/15 text-[#EEA122]">
                  {loading ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Icon size={20} aria-hidden="true" />}
                </span>
                <b className="mt-3 text-base font-black text-[#F3EFE5]">{loading ? t("جارٍ فتح المطعم…") : role.cta}</b>
                <span className="mt-1 text-sm leading-6 text-[#F3EFE5]/65">{role.text}</span>
              </button>
            );
          })}
        </div>
        {error && <p role="alert" className="mt-4 text-sm font-bold text-[#ff8a7a]">{error}</p>}
      </Reveal>
    </section>
  );
}
