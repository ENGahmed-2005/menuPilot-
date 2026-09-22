import { createContext, useContext, useEffect, useState } from "react";
import { useLogto } from "@logto/react";
import { bootstrap } from "../api/auth";
import { setAccessTokenGetter } from "../api/client";

const AuthContext = createContext(null);
const API_RESOURCE = import.meta.env.VITE_LOGTO_API_RESOURCE || "https://api.menupilot.local";
const PENDING_KEY = "menupilot_pending_signup";

export function AuthProvider({ children }) {
  const { isLoading: logtoLoading, isAuthenticated, getIdTokenClaims, getAccessToken, signIn, signOut } = useLogto();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAccessTokenGetter(isAuthenticated ? () => getAccessToken(API_RESOURCE) : null);
    return () => setAccessTokenGetter(null);
  }, [getAccessToken, isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      if (logtoLoading) return;

      if (!isAuthenticated) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const claims = await getIdTokenClaims();
        const accessToken = await getAccessToken(API_RESOURCE);
        const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null");

        const data = await bootstrap({
          id_token: claims?.__raw,
          access_token: accessToken,
          restaurant_name: pending?.restaurantName || claims?.name || "مطعمي",
          restaurant_type: pending?.restaurantType || null,
          plan: pending?.plan || "trial",
        });

        sessionStorage.removeItem(PENDING_KEY);
        if (!cancelled) setUser(data.user || data);
      } catch (error) {
        if (!cancelled) {
          setUser(null);
          console.error("Logto bootstrap failed:", error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    sync();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken, getIdTokenClaims, isAuthenticated, logtoLoading]);

  async function login(options = {}) {
    sessionStorage.setItem("menupilot_login_return", options.returnTo || window.location.pathname);
    await signIn({
      redirectUri: `${window.location.origin}/callback`,
      firstScreen: "sign_in",
      identifier: ["email"],
      ...(options.email ? { loginHint: options.email } : {}),
    });
  }

  async function register(payload) {
    sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({
        restaurantName: payload.restaurantName,
        restaurantType: payload.restaurantType,
        plan: payload.plan || "trial",
      }),
    );

    await signIn({
      redirectUri: `${window.location.origin}/callback`,
      firstScreen: "identifier:register",
      identifier: ["email"],
      ...(payload.email ? { loginHint: payload.email } : {}),
    });
  }

  async function logout() {
    setUser(null);
    await signOut(`${window.location.origin}/`);
  }

  function updateUser(patch) {
    setUser((prev) => (prev ? { ...prev, ...patch } : patch));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isAuthenticated: isAuthenticated && Boolean(user),
        loading: loading || logtoLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
