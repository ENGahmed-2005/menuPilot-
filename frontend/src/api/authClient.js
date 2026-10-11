/* authClient.js — the Better Auth browser client, same-origin at /api/auth (loaded lazily by api/auth.js). */
import { createAuthClient } from "better-auth/client";
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: "/api/auth",
  plugins: [twoFactorClient()],
  fetchOptions: { credentials: "same-origin" },
});
