/* The API's address, one place for every module that calls it. Same origin by
   default: the frontend's host proxies /api to Laravel and /api/auth to the auth
   service (vercel.json, Caddyfile, vite.config.js), so the session cookie applies. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
