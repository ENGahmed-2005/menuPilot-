import { Clock3, LayoutDashboard, QrCode, ShieldCheck } from "lucide-react";

const ITEMS = [
  [QrCode,          "QR Ordering",    "اطلب بدون نادل"],
  [Clock3,          "تشغيل أسرع",    "وقت أقل، إنتاج أكثر"],
  [ShieldCheck,     "صلاحيات آمنة",  "كل دور بحدوده"],
  [LayoutDashboard, "إدارة مركزية",  "كل شيء في مكان"],
];

export default function ValueStrip() {
  return (
    <section className="border-y border-[#F3EFE5]/8 bg-[#F3EFE5]/[.02]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-x-reverse divide-[#F3EFE5]/8 px-0 sm:grid-cols-4">
        {ITEMS.map(([Icon, title, sub]) => (
          <div
            key={title}
            className="flex flex-col items-center gap-2 px-4 py-7 text-center sm:px-6"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EEA122]/10 text-[#EEA122]">
              <Icon size={18} />
            </span>
            <span className="text-sm font-black text-[#F3EFE5]/90">{title}</span>
            <span className="text-[11px] text-[#F3EFE5]/70">{sub}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
