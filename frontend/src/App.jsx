/* ========================================================================
   App.jsx — المكوّن الأعلى في التطبيق
   ------------------------------------------------------------------------
   يجمع Providers ويجعل العربية RTL بشكل افتراضي على مستوى التطبيق كله.
   ======================================================================== */
import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import { CartProvider } from "./context/CartContext";
import AppRoutes from "./routes/AppRoutes";
import LoadingScreen from "./components/loading/LoadingScreen";

function DirectionController() {
  const { lang, dir } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  return null;
}

/** بوابة قبل عرض التطبيق: لحد ما AuthContext يخلص من فحص التوكن المحفوظ
 *  (GET /auth/me)، نعرض شاشة التحميل بدل ما نسيب الراوتس تتقيّم بـ user=null
 *  وتحوّل أي صفحة محمية لصفحة الدخول لحظيًا حتى لو المستخدم عنده جلسة فعلية. */
function AuthGate({ children }) {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthGate>
          <LanguageProvider defaultLang="ar">
            <DirectionController />
            <CartProvider>
              <AppRoutes />
            </CartProvider>
          </LanguageProvider>
        </AuthGate>
      </AuthProvider>
    </BrowserRouter>
  );
}
