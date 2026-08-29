/* ==========================================================================
   ValueStrip.jsx — شريط رفيع بأربع نقاط قيمة سريعة (تحت الـ Hero مباشرة)
   ========================================================================== */
import { Clock3, LayoutDashboard, QrCode, ShieldCheck } from "lucide-react";

const ITEMS = [
  [QrCode, "QR Ordering"],
  [Clock3, "تشغيل أسرع"],
  [ShieldCheck, "صلاحيات آمنة"],
  [LayoutDashboard, "إدارة مركزية"],
];

export default function ValueStrip() {
  return (
    <section className="border-y border-[#F3EFE5]/10 bg-[#F3EFE5]/[.025]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 py-7 sm:grid-cols-4 sm:px-8 lg:px-10">
        {ITEMS.map(([Icon, text]) => (
          <div key={text} className="flex items-center justify-center gap-2 border-[#F3EFE5]/10 py-2 text-sm font-bold text-[#F3EFE5]/65 sm:border-l last:border-l-0">
            <Icon size={17} className="text-[#EEA122]" /> {text}
          </div>
        ))}
      </div>
    </section>
  );
}
