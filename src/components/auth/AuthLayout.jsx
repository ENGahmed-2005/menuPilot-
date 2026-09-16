/* إطار مشترك لصفحات auth مع شعار menuPilot الرسمي */
import { CheckCircle2 } from "lucide-react";

const FEATURES = [
  "طلب مباشر من الطاولة عبر QR",
  "متابعة حية لحالة كل طلب",
  "لوحات مخصّصة للمطبخ والكاشير والنادل",
];

export default function AuthLayout({ eyebrow, title, subtitle, children }) {
  return (
    <div dir="rtl" className="flex min-h-screen flex-col bg-paper-2 font-body lg:flex-row">
      <aside className="relative flex flex-col justify-between overflow-hidden bg-ink px-8 py-10 text-paper lg:w-[42%] lg:px-14 lg:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, #F3EFE5 1px, transparent 1px)", backgroundSize: "18px 18px" }} />

        <div className="relative">
          <span className="brand-logo-surface inline-flex items-center rounded-xl px-3 py-2">
            <img src="/menuPilot-logo.svg" alt="menuPilot" className="brand-logo h-10 w-auto" />
          </span>
        </div>

        <div className="relative space-y-6">
          <p className="font-display text-3xl leading-tight lg:text-4xl">{title}</p>
          {subtitle && <p className="max-w-sm text-sm leading-relaxed text-paper/70">{subtitle}</p>}
          <ul className="space-y-2.5 pt-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-paper/80">
                <CheckCircle2 size={16} className="shrink-0 text-copper" aria-hidden="true" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-paper/40">© {new Date().getFullYear()} منيو-بايلوت — جميع الحقوق محفوظة</p>

        <div aria-hidden="true" className="absolute bottom-0 right-0 top-0 hidden w-6 translate-x-1/2 lg:block" style={{ backgroundImage: "radial-gradient(circle, #F3EFE5 8px, transparent 9px)", backgroundSize: "24px 24px", backgroundRepeat: "repeat-y", backgroundPosition: "center" }} />
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md rounded-2xl bg-white/70 p-8 shadow-xl shadow-ink/5 sm:p-10">
          {eyebrow && <span className="mb-2 block text-xs font-medium tracking-wide text-copper-deep">{eyebrow}</span>}
          {children}
        </div>
      </main>
    </div>
  );
}
