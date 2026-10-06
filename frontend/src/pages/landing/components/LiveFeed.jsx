/* LiveFeed.jsx — over the hero screenshot, what happens to an order as it
   moves: a new order, the kitchen, ready, paid. One event at a time, like the
   app's own notifications. Decorative (the screenshot carries the content),
   so screen readers skip it; still, on the first event, for reduced motion. */
import { useEffect, useState } from "react";
import { BellRing, ChefHat, CircleCheck, Wallet } from "lucide-react";
import { prefersReducedMotion } from "./useInView";
import { t } from "../../../i18n";

const STEP_MS = 2800;

const TONES = {
  copper: "bg-[#E67E22]/15 text-[#A15818]",
  ink: "bg-[#172331]/[.07] text-[#172331]",
  herb: "bg-[#1C714B]/12 text-[#1C714B]",
};

const EVENTS = [
  { icon: BellRing, tone: "copper", title: t("طلب جديد · طاولة 4"), text: t("شاورما عربي × 2، ليمون بالنعناع") },
  { icon: ChefHat, tone: "ink", title: t("المطبخ بدأ التحضير"), text: t("طلب #7 · جاهز خلال 15 د تقريبًا") },
  { icon: CircleCheck, tone: "herb", title: t("جاهز للتقديم · طاولة 2"), text: t("وصل التنبيه للنادل") },
  { icon: Wallet, tone: "herb", title: t("تم الدفع · طاولة 5"), text: t("₪ 64 نقدًا، والطاولة أصبحت متاحة") },
];

export default function LiveFeed({ className = "" }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const id = setInterval(() => setI((n) => (n + 1) % EVENTS.length), STEP_MS);
    return () => clearInterval(id);
  }, []);
  const e = EVENTS[i];
  const Icon = e.icon;

  return (
    <div aria-hidden="true" className={`pointer-events-none w-72 ${className}`}>
      <div key={i} className="toast-in flex items-start gap-3 rounded-2xl border border-[#172331]/10 bg-[#FFFDF9] p-3 text-[#172331] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)]">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${TONES[e.tone]}`}>
          <Icon size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <b className="truncate text-[13px] font-black leading-5">{e.title}</b>
            <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-[#5A6574]">
              <i className="animate-pulse-soft h-1.5 w-1.5 rounded-full bg-[#1C714B]" />
              {t("الآن")}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-xs leading-5 text-[#5A6574]">{e.text}</span>
        </span>
      </div>
    </div>
  );
}
