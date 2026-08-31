/* ==========================================================================
   client.js — العميل المركزي لكل طلبات الـ API
   --------------------------------------------------------------------------
   كل ملفات api/*.js تستورد `request` من هنا بدل ما توزع fetch() بكل مكان.
   الفائدة: تغيير الـ base URL أو طريقة إرفاق التوكن يصير بمكان واحد فقط.

   الـ backend المستهدف حسب الـ SRS هو Laravel (REST API)، لذلك الشكل هنا
   متوافق افتراضيًا مع اتفاقيات Laravel (Bearer token عبر Sanctum، وأخطاء
   validation ترجع بصيغة { message, errors: { field: [..] } }).
   ========================================================================== */

import { mockRequest } from "./mockServer";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

// USE_MOCKS: طالما ملف .env ما بيحدد VITE_USE_MOCKS=false صراحة، تشتغل
// الواجهة على بيانات وهمية (mockServer.js) بدل ما تنتظر Laravel الحقيقي.
// لما الـ backend يجهز: أضف VITE_USE_MOCKS=false في .env وبس.
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

if (USE_MOCKS && typeof window !== "undefined") {
  console.info(
    "%c[menuPilot] Mock API mode ON — no backend needed. Demo logins: owner@menupilot.test / kitchen@menupilot.test / cashier@menupilot.test / waiter@menupilot.test (password: password123)",
    "color:#EEA122"
  );
}

// مفتاح التخزين المحلي للتوكن. لاحقًا AuthContext هو من يقرأ/يكتب هذا المفتاح.
const TOKEN_KEY = "menupilot_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * request — غلاف حول fetch يضيف تلقائيًا:
 *   - الـ base URL
 *   - Content-Type: application/json
 *   - Authorization: Bearer <token> إن وجد
 *   - تحويل الأخطاء غير الناجحة (status >= 400) إلى Exception موحّد
 *
 * @param {string} path - المسار بعد /api، مثال: "/auth/login"
 * @param {object} options - نفس خيارات fetch (method, body, ...)
 */
export async function request(path, options = {}) {
  const token = getToken();

  if (USE_MOCKS) {
    return mockRequest(options.method || "GET", path, options.body, token);
  }

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Laravel يرجع 204 (No Content) لبعض عمليات الحذف — لا يوجد body لتفسيره.
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const error = new Error(data?.message || `Request failed: ${response.status}`);
    error.status = response.status;
    error.errors = data?.errors || null; // أخطاء validation لكل حقل (Laravel style)
    throw error;
  }

  return data;
}

export const api = {
  get: (path) => request(path, { method: "GET" }),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};
