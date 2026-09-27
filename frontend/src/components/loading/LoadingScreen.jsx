/* ==========================================================================
   LoadingScreen.jsx — branded loading states.
   --------------------------------------------------------------------------
   LoadingScreen: full screen, shown while the saved session is checked on
     first load. It fades in after a short delay, so fast loads never flash it.
   PageLoader: in-page version used while a route's code downloads.
   Pure CSS (no canvas / three.js), ~1 KB, and static under reduced motion.
   ========================================================================== */
import Logo from "../brand/Logo";

function Bar({ tone = "dark" }) {
  return (
    <span aria-hidden="true" className={`relative block h-1 w-40 overflow-hidden rounded-full ${tone === "dark" ? "bg-paper/10" : "bg-ink/10"}`}>
      <span className="loader-bar absolute inset-y-0 w-1/3 rounded-full bg-copper" />
    </span>
  );
}

export default function LoadingScreen({ label = "جارِ تجهيز لوحتك…" }) {
  return (
    <div role="status" aria-live="polite" dir="rtl" className="loader-delay fixed inset-0 z-[999] grid place-items-center bg-ink text-paper">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle, #f4efe6 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div className="relative flex flex-col items-center gap-7">
        <span className="loader-mark"><Logo layout="stacked" on="dark" height={132} priority alt="" /></span>
        <Bar />
        <span className="text-sm font-bold text-paper/70">{label}</span>
      </div>
    </div>
  );
}

export function PageLoader({ label = "جارِ فتح الصفحة…" }) {
  return (
    <div role="status" aria-live="polite" className="loader-delay grid min-h-[60vh] place-items-center bg-paper-2">
      <div className="flex flex-col items-center gap-5">
        <span className="loader-mark"><Logo layout="mark" height={56} priority alt="" /></span>
        <Bar tone="light" />
        <span className="text-sm font-bold text-muted">{label}</span>
      </div>
    </div>
  );
}
