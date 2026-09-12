/* ==========================================================================
   Footer.jsx — تذييل صفحة الهبوط
   ========================================================================== */
import { QrCode } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-[#F3EFE5]/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-[#F3EFE5]/45 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
        <div className="flex items-center gap-2 font-black text-[#F3EFE5]/75">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#EEA122] text-[#1F2420]"><QrCode size={17} /></span>
          menuPilot
        </div>
        <div>نظام إدارة مطاعم مبني ليجعل التشغيل أبسط.</div>
        <div>© {new Date().getFullYear()} menuPilot</div>
      </div>
    </footer>
  );
}
