/* ==========================================================================
   CTASection.jsx — بانر الدعوة لإجراء قبل الفوتر
   --------------------------------------------------------------------------
   خلفية "ستارة ضوء" تفاعلية (LightCurtain) بدل التدرّج الثابت — نفس ألوان
   الهوية (حبر داكن + توهج نحاسي/كهرماني). القسم صار غامق بدل النحاسي
   الصريح عشان الـ shader معتم بالكامل (بيرسم خلفيته هو، مش طبقة شفافة).
   ========================================================================== */
import { ArrowLeft, ArrowRight, ScanLine } from "lucide-react";
import { lang } from "../../../i18n";
import { landingCopy } from "./landingCopy";

export default function CTASection({ onNavigate }) {
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <section className="landing-cta-wrap">
      <div className="landing-cta-card">
        <div className="landing-bill-top">
          <span><ScanLine size={15} aria-hidden="true" />{landingCopy.finalLabel}</span>
          <span>menuPilot <i>·</i> {landingCopy.liveStatus}</span>
        </div>
        <h2>{landingCopy.finalTitle}</h2>
        <p className="landing-bill-description">{landingCopy.finalDescription}</p>
        <div className="landing-bill-rule" aria-hidden="true" />
        <div className="landing-bill-total">
          <span>{landingCopy.finalTotalLabel}</span>
          <strong>{landingCopy.finalTotal}</strong>
        </div>
        <div className="landing-bill-bottom">
          <p>{landingCopy.finalFinePrint}</p>
          <button type="button" onClick={() => onNavigate("/register")} className="landing-bill-button">
            {landingCopy.finalCta}<Arrow size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
