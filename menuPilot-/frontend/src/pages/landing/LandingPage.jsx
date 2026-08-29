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
import ValueStrip from "./components/ValueStrip";
import Features from "./components/Features";
import HowItWorks from "./components/HowItWorks";
import Roles from "./components/Roles";
import TeamSection from "./components/TeamSection";
import CTASection from "./components/CTASection";
import Footer from "./components/Footer";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <main
      dir="rtl"
      className="min-h-screen scroll-smooth overflow-hidden bg-[#1F2420] text-[#F3EFE5] [cursor:url('/cursor_eat.cur'),_auto]"
    >
      <Navbar onNavigate={navigate} />
      <Hero onNavigate={navigate} />
      <ValueStrip />
      <Features />
      <HowItWorks />
      <Roles />

      {/* TEAM: intentionally before CTA + footer */}
      <section id="team" className="border-t border-[#F3EFE5]/10 bg-[#F3EFE5]/[.02]">
        <TeamSection />
      </section>

      <CTASection onNavigate={navigate} />
      <Footer />
    </main>
  );
}
