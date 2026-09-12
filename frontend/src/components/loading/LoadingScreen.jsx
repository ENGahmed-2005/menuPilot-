/* ==========================================================================
   LoadingScreen.jsx — شاشة تحميل بشعار menuPilot متحرك حول محيط دائرة/مثلث
   --------------------------------------------------------------------------
   بتظهر أثناء AuthContext بيتحقق من التوكن المحفوظ (GET /auth/me) عند فتح
   التطبيق لأول مرة — نفس الحالة اللي كانت قبل كده بتعدي من غير أي مؤشر،
   وده كان بيسبب ومضة تحويل لصفحة تسجيل الدخول حتى لو المستخدم عنده جلسة
   شغّالة فعلاً (لأن ProtectedRoute كان بيشوف user=null لحظة الفحص).
   ========================================================================== */
import OutlineTypeflow from "./OutlineTypeflow";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[999]">
      <OutlineTypeflow
        background="#1F2420"
        baseColor="#EEA122"
        phrase="menupilotmenupilotmenupilot"
        mark={{ source: "text", text: "menuPilot", letterSpacing: 0 }}
        flow={{ markSize: 78, spacing: 150, kick: 60, light: 200 }}
        glyphSize={90}
        speed={22}
        hover={150}
        style={{ minWidth: 0, minHeight: 0, width: "100%", height: "100%" }}
      />
    </div>
  );
}
