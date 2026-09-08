import { api, setToken, getToken } from "./client";

const STAFF_KEY = "menupilot_staff";
const staffList = () => { try { return JSON.parse(localStorage.getItem(STAFF_KEY) || "[]"); } catch { return []; } };

export async function register(payload) {
  const data = await api.post("/auth/register", {
    restaurant_name: payload.restaurantName,
    email: payload.email,
    password: payload.password,
    password_confirmation: payload.passwordConfirmation,
    plan: payload.plan,
  });
  if (data?.token) setToken(data.token);
  return data;
}

export async function login(payload) {
  const staff = staffList().find((x) => x.email.toLowerCase() === payload.email.toLowerCase() && x.password === payload.password && x.active !== false);
  if (staff) {
    const token = `staff.${staff.id}`;
    setToken(token);
    return { token, user: { id: staff.id, email: staff.email, name: staff.name, role: staff.role, restaurantName: "مطعمك" } };
  }
  const data = await api.post("/auth/login", { email: payload.email, password: payload.password });
  if (data?.token) setToken(data.token);
  return data;
}

export async function logout() {
  try { if (!String(getToken() || "").startsWith("staff.")) await api.post("/auth/logout"); }
  finally { setToken(null); }
}

export async function fetchCurrentUser() {
  const token = getToken();
  if (String(token || "").startsWith("staff.")) {
    const id = token.slice("staff.".length);
    const staff = staffList().find((x) => x.id === id && x.active !== false);
    if (!staff) throw new Error("Session expired.");
    return { id: staff.id, email: staff.email, name: staff.name, role: staff.role, restaurantName: "مطعمك" };
  }
  return api.get("/auth/me");
}

export async function forgotPassword(payload) { return api.post("/auth/forgot-password", { email: payload.email }); }
export async function resetPassword(payload) { return api.post("/auth/reset-password", { token: payload.token, email: payload.email, password: payload.password, password_confirmation: payload.passwordConfirmation }); }
