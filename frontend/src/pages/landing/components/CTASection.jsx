/* ==========================================================================
   CTASection.jsx — بانر الدعوة لإجراء قبل الفوتر
   --------------------------------------------------------------------------
   خلفية "ستارة ضوء" تفاعلية (LightCurtain) بدل التدرّج الثابت — نفس ألوان
   الهوية (حبر داكن + توهج نحاسي/كهرماني). القسم صار غامق بدل النحاسي
   الصريح عشان الـ shader معتم بالكامل (بيرسم خلفيته هو، مش طبقة شفافة).
   ========================================================================== */
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ScanLine } from "lucide-react";
import LightCurtain from "./backgrounds/LightCurtain";

/**
 * LightCurtain بياخد width/height كـ props مباشرة (مش بيقيس أبعاده من الـ
 * DOM بنفسه) — فلو ما بعتناها، بيرجع لقيمة افتراضية ثابتة (1200×800) بدل
 * ما ياخد حجم حاويته الفعلي، وده كان سبب ظهوره بحجم غلط ومنكسر برا حدود
 * الكارد. هالـ hook بيقيس الحاوية فعليًا (ResizeObserver) ويمرر الرقم
 * الحقيقي بكسل.
 */
function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, size];
}

export default function CTASection({ onNavigate }) {
  const [bgRef, bgSize] = useElementSize();

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
      <div className="relative isolate h-[26rem] overflow-hidden rounded-[2rem] text-center sm:h-[24rem]">
        <div ref={bgRef} className="absolute inset-0 -z-10">
          {bgSize.width > 0 && bgSize.height > 0 && (
            <LightCurtain
              background="#1F2420"
              baseColor="#8A5A2A"
              accentColor="#EEA122"
              highlight="#FFD9A0"
              reach={26}
              density={140}
              width={bgSize.width}
              height={bgSize.height}
            />
          )}
        </div>
        <div className="relative flex h-full flex-col items-center justify-center px-7 py-14 sm:px-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#F3EFE5]/10 px-4 py-2 text-xs font-black text-[#F3EFE5]">
            <ScanLine size={14} /> جاهز لتجربة مختلفة؟
          </span>
          <h2 className="mx-auto mt-6 max-w-3xl text-4xl font-black tracking-tight text-[#F3EFE5] sm:text-5xl">
            خلّي فريقك يركز على الضيف، وخلي menuPilot يتولى التشغيل.
          </h2>
          <button
            onClick={() => onNavigate("/register")}
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#EEA122] px-7 py-4 font-black text-[#1F2420] transition hover:-translate-y-0.5 hover:bg-[#E67E22]"
          >
            ابدأ الآن
            <ArrowLeft size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
