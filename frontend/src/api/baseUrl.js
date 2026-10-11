/* The API's address, one place for every module that calls it. Always this
   origin: the frontend's host proxies /api to Laravel and /api/auth to the
   auth service (vercel.json, Caddyfile, vite.config.js), which is what lets
   the session cookie reach both. A different origin would never get it. */
export const API_BASE_URL = "/api";
