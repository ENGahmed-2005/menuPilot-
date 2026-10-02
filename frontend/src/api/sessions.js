import { saveSessionToken } from "../utils/sessionToken";
import { api } from "./client";
import { t } from "../i18n";

const isMockMode = () => import.meta.env.VITE_USE_MOCKS === "true";

const locationError = (message, code = "LOCATION_REQUIRED") => { const error = new Error(message); error.status = 403; error.code = code; return error; };

function getLocation() {
  if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") throw locationError(t("تحديد الموقع يحتاج إلى HTTPS عند فتح الموقع من هاتف أو جهاز آخر. افتح نسخة HTTPS من النظام ثم حاول مرة أخرى."), "LOCATION_SECURE_CONTEXT_REQUIRED");
  if (!navigator.geolocation) throw locationError(t("هذا المتصفح لا يدعم تحديد الموقع."));
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, (error) => {
    const messages = { 1: t("تم رفض صلاحية الموقع. اسمح للموقع بالوصول إلى موقعك ثم أعد المحاولة."), 2: t("تعذر تحديد موقعك حاليًا. تأكد من تشغيل خدمات الموقع وحاول مرة أخرى."), 3: t("استغرق تحديد الموقع وقتًا طويلًا. تأكد من تشغيل GPS وحاول مرة أخرى.") };
    reject(locationError(messages[error.code] || t("تعذر تحديد موقعك. حاول مرة أخرى.")));
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
}

export const openSession = async (payload) => {
  const body = { name: payload.name, phone: payload.phone };
  if (!isMockMode()) { const position = await getLocation(); body.latitude = position.coords.latitude; body.longitude = position.coords.longitude; }
  const session = await api.post(`/public/tables/${payload.tableCode}/sessions`, body);
  // Keep the session secret on this phone; later calls send it automatically.
  saveSessionToken(session?.id, session?.access_token);
  return session;
};

export const getSession = (sessionId) => api.get(`/public/sessions/${sessionId}`);
export const updateCustomer = (sessionId, payload) => api.patch(`/public/sessions/${sessionId}/customer`, payload);
export const requestWaiterAssistance = (sessionId, note) => api.post(`/public/sessions/${sessionId}/assistance-requests`, note ? { note } : undefined);
export const getActiveSessions = () => api.get("/sessions?status=active");
/** US-11: staff mark every pending waiter call of a session as handled. */
export const resolveSessionAssistance = (sessionId) => api.post(`/sessions/${sessionId}/assistance/resolve`);

/** Customer ends their own session (only when nothing is owed). */
export const leaveSession = (sessionId) => api.post(`/public/sessions/${sessionId}/leave`);
