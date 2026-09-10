import { api } from "./client";

const useMocks = () => import.meta.env.VITE_USE_MOCKS === "true";

export const openSession = async (payload) => {
  if (useMocks()) {
    return api.post(`/public/tables/${payload.tableCode}/sessions`, {
      name: payload.name,
      phone: payload.phone,
    });
  }

  if (!navigator.geolocation) {
    const error = new Error("يجب السماح بتحديد الموقع للتأكد من وجودك داخل المطعم.");
    error.status = 403;
    error.code = "LOCATION_REQUIRED";
    throw error;
  }

  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    });
  }).catch(() => null);

  if (!position) {
    const error = new Error("يجب السماح بتحديد الموقع للتأكد من وجودك داخل المطعم.");
    error.status = 403;
    error.code = "LOCATION_REQUIRED";
    throw error;
  }

  return api.post(`/public/tables/${payload.tableCode}/sessions`, {
    name: payload.name,
    phone: payload.phone,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });
};

export const getSession = (sessionId) => api.get(`/public/sessions/${sessionId}`);
export const requestWaiterAssistance = (sessionId) => api.post(`/public/sessions/${sessionId}/assistance-requests`);
export const getActiveSessions = () => api.get("/sessions?status=active");
