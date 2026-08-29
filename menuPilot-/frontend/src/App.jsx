/* ========================================================================
   App.jsx — المكوّن الأعلى في التطبيق
   ------------------------------------------------------------------------
   يجمع Providers ويجعل العربية RTL بشكل افتراضي على مستوى التطبيق كله.
   ======================================================================== */
import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import { CartProvider } from "./context/CartContext";
import AppRoutes from "./routes/AppRoutes";

function DirectionController() {
  const { lang, dir } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider defaultLang="ar">
          <DirectionController />
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
