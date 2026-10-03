/* ==========================================================================
   LandingPage.jsx — صفحة الهبوط (الصفحة الحية على "/")
   --------------------------------------------------------------------------
   ملف تجميع رفيع فقط: كل قسم مقسوم لمكوّن مستقل في ./components، والمحتوى
   الثابت (نصوص/بيانات) في ./components/data.js. أي تعديل نصّي أو تصميمي
   لقسم معيّن يصير في ملفه الخاص بدل التنقيب في ملف واحد ضخم.

   مؤشر الفأرة: ملف .cur حقيقي (شوكة وسكينة) رفعه المستخدم، بدل SVG مرسوم
   يدويًا. صيغة .cur تحمل نقطة الالتقاط (hotspot) جوّا الملف نفسه، فمفيش
   داعي لتحديد إحداثيات X/Y زي ما بيتطلب مع png/svg.
   ========================================================================== */
import { useNavigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ProductTour from "./components/ProductTour";
import Pricing from "./components/Pricing";
import TeamSection from "./components/TeamSection";
import CTASection from "./components/CTASection";
import Footer from "./components/Footer";
import { dir } from "../../i18n";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <main
      dir={dir}
      className="min-h-screen scroll-smooth overflow-x-hidden bg-navy text-[#F3EFE5] [cursor:url('/cursor_eat.cur'),_auto]"
    >
      <Navbar onNavigate={navigate} />
      {/* Spacer to compensate for the fixed navbar height (4.25rem ≈ 68px) */}
      <div className="h-[4.25rem]" aria-hidden="true" />
      <Hero onNavigate={navigate} />
      <ProductTour />
      <Pricing />

      {/* TEAM: intentionally before CTA + footer */}
      <section id="team" className="border-t border-[#F3EFE5]/10 bg-[#F3EFE5]/[.02]">
        <TeamSection />
      </section>

      <CTASection onNavigate={navigate} />
      <Footer />
    </main>
  );
}
