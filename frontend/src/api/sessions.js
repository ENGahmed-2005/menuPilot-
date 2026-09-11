import { api } from "./client";

const useMocks = () => import.meta.env.VITE_USE_MOCKS === "true";

const locationError = (message, code = "LOCATION_REQUIRED") => {
  const error = new Error(message);
  error.status = 403;
  error.code = code;
  return error;
};

function getLocation() {
  if (!window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    throw locationError("تحديد الموقع يحتاج إلى HTTPS عند فتح الموقع من هاتف أو جهاز آخر. افتح نسخة HTTPS من النظام ثم حاول مرة أخرى.", "LOCATION_SECURE_CONTEXT_REQUIRED");
  }

  if (!navigator.geolocation) {
    throw locationError("هذا المتصفح لا يدعم تحديد الموقع.");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        const messages = {
          1: "تم رفض صلاحية الموقع. اسمح للموقع بالوصول إلى موقعك ثم أعد المحاولة.",
          2: "تعذر تحديد موقعك حاليًا. تأكد من تشغيل خدمات الموقع وحاول مرة أخرى.",
          3: "استغرق تحديد الموقع وقتًا طويلًا. تأكد من تشغيل GPS وحاول مرة أخرى.",
        };
        reject(locationError(messages[error.code] || "تعذر تحديد موقعك. حاول مرة أخرى."));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });
}

export const openSession = async (payload) => {
  const body = {
    name: payload.name,
    phone: payload.phone,
  };

  if (!useMocks()) {
    const position = await getLocation();
    body.latitude = position.coords.latitude;
    body.longitude = position.coords.longitude;
  }

  return api.post(`/public/tables/${payload.tableCode}/sessions`, body);
};

export const getSession = (sessionId) => api.get(`/public/sessions/${sessionId}`);
export const requestWaiterAssistance = (sessionId) => api.post(`/public/sessions/${sessionId}/assistance-requests`);
export const getActiveSessions = () => api.get("/sessions?status=active");
