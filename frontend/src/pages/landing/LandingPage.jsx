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
import HowItWorks from "./components/HowItWorks";
import Roles from "./components/Roles";
import TryDemo from "./components/TryDemo";
import Pricing from "./components/Pricing";
import TeamSection from "./components/TeamSection";
import CTASection from "./components/CTASection";
import Footer from "./components/Footer";
import ValueStrip from "./components/ValueStrip";
import OrderJourney from "./components/OrderJourney";
import LandingCursor from "./components/LandingCursor";
import { dir } from "../../i18n";
import "./landing.css";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <main
      dir={dir}
      className="landing-page min-h-screen scroll-smooth"
    >
      <Navbar onNavigate={navigate} />
      <div className="landing-nav-spacer" aria-hidden="true" />
      <Hero onNavigate={navigate} />
      <OrderJourney />
      <ValueStrip />
      <ProductTour />
      <HowItWorks />
      <Roles />
      <TryDemo />
      <Pricing />
      <section className="landing-team-wrap border-t border-[#f4efe6]/10 bg-[#f4efe6]/[.02]">
        <TeamSection />
      </section>
      <CTASection onNavigate={navigate} />
      <Footer />
      <LandingCursor />
    </main>
  );
}
