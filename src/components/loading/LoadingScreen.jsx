/* شاشة التحميل الموحدة مع شعار menuPilot الرسمي */
import OutlineTypeflow from "./OutlineTypeflow";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[999] bg-[#1F2420]">
      <OutlineTypeflow
        background="#1F2420"
        baseColor="#EEA122"
        phrase="menupilot"
        mark={{ source: "text", text: "" }}
        flow={{ markSize: 60, spacing: 140, kick: 60, light: 220 }}
        glyphSize={70}
        speed={20}
        hover={150}
        style={{ minWidth: 0, minHeight: 0, width: "100%", height: "100%" }}
      />

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4">
        <span className="brand-logo-surface inline-flex items-center rounded-2xl px-5 py-3 shadow-2xl">
          <img src="/menuPilot-logo.svg" alt="menuPilot" className="brand-logo h-14 w-auto sm:h-16" />
        </span>
        <span className="text-xs font-medium tracking-[0.3em] text-[#F3EFE5]/40">
          جارِ التحميل…
        </span>
      </div>
    </div>
  );
}
