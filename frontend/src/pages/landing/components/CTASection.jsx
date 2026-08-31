/* ==========================================================================
   CTASection.jsx — بانر الدعوة لإجراء قبل الفوتر
   ========================================================================== */
import { ArrowLeft, ScanLine } from "lucide-react";

export default function CTASection({ onNavigate }) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
      <div className="relative overflow-hidden rounded-[2rem] bg-[#EEA122] px-7 py-14 text-center text-[#1F2420] sm:px-12">
        <div className="absolute -left-16 -top-20 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
        <div className="absolute -bottom-20 -right-16 h-48 w-48 rounded-full bg-[#E67E22]/30 blur-2xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#1F2420]/10 px-4 py-2 text-xs font-black">
            <ScanLine size={14} /> جاهز لتجربة مختلفة؟
          </span>
          <h2 className="mx-auto mt-6 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
            خلّي فريقك يركز على الضيف، وخلي menuPilot يتولى التشغيل.
          </h2>
          <button
            onClick={() => onNavigate("/register")}
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#1F2420] px-7 py-4 font-black text-[#F3EFE5] transition hover:bg-[#4B5147]"
          >
            ابدأ الآن
            <ArrowLeft size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
