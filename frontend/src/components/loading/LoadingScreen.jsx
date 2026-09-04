/* ==========================================================================
   LoadingScreen.jsx — شاشة تحميل: حلقة متحركة (Canvas) + شعار menuPilot
   نص HTML حقيقي فوقها
   --------------------------------------------------------------------------
   ليه مش سايبها تكتب "menuPilot" كنص متتبَّع زي المحاولة الأولى؟
   OutlineTypeflow بيشتغل بمرحلتين منفصلتين:
     1) يرسم mark.text على canvas مخفي، ويتتبّع محيطه (marching squares).
     2) يرسم حروف phrase صغيرة متحركة على طول المحيط ده، كل حرف بزاوية
        الظل المماسي للمسار في مكانه.
   المشكلة: حروف رفيعة زي i/l/t بيبقى محيطها أجزاء قصيرة جدًا، بتتفلتر
   بمعيار minLen جوّا traceContours وتختفي — ده سبب "جزء من النص مش
   مبين". وحتى لو اتتبّعت كاملة، النتيجة أصلًا حروف صغيرة بتتحرك على
   شكل الحرف الكبير، مش نص "menuPilot" مقروء — هي تقنية فنية تجريدية،
   مش أداة لكتابة نص واضح.

   الحل هنا: خليت mark.text فاضي عشان يرجع تلقائيًا للشكل الاحتياطي
   الجاهز (حلقة + مثلث، FALLBACK_PATH داخل الملف) — شكل مضمون التتبّع
   الكامل دايمًا لأنه مسار SVG جاهز، مش نص بيتحوّل لصورة. وحطيت
   "menuPilot" كنص HTML عادي فوق الكانفاس — مضمون الظهور 100% مهما كان
   أداء التتبّع، وده اللي المفروض يبان بوضوح كشعار.
   ========================================================================== */
import OutlineTypeflow from "./OutlineTypeflow";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[999] bg-[#1F2420]">
      {/* الحلقة المتحركة — شكل احتياطي ثابت (مش نص) عشان تتبّعها مضمون دايمًا */}
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

      {/* الشعار الفعلي — نص HTML حقيقي، مش جزء من الرسم المتحرك، فمضمون
          إنه يبان واضح ومقروء دايمًا. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
        <span className="font-display text-4xl tracking-tight text-[#F3EFE5] sm:text-5xl">
          menu<span className="text-[#EEA122]">Pilot</span>
        </span>
        <span className="text-xs font-medium tracking-[0.3em] text-[#F3EFE5]/40">
          جارِ التحميل…
        </span>
      </div>
    </div>
  );
}
