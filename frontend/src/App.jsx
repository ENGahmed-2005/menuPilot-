import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { LogtoProvider, UserScope } from "@logto/react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import { CartProvider } from "./context/CartContext";
import AppRoutes from "./routes/AppRoutes";
import LoadingScreen from "./components/loading/LoadingScreen";

const LOGTO_ENDPOINT = import.meta.env.VITE_LOGTO_ENDPOINT || "https://mxodny.logto.app/";
const LOGTO_APP_ID = import.meta.env.VITE_LOGTO_APP_ID || "6cdahvzsdobmzftwzlbrd";
const LOGTO_API_RESOURCE = import.meta.env.VITE_LOGTO_API_RESOURCE || "https://api.menupilot.local";

const logtoConfig = {
  endpoint: LOGTO_ENDPOINT,
  appId: LOGTO_APP_ID,
  scopes: [UserScope.Email],
};

function DirectionController() {
  const { lang, dir } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  return null;
}

function AuthGate({ children }) {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <LogtoProvider config={logtoConfig}>
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
      </LogtoProvider>
    </BrowserRouter>
  );
}
