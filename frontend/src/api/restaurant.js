import { api } from "./client";

const MOCK_KEY = "menupilot_restaurant_settings";
const useMocks = () => import.meta.env.VITE_USE_MOCKS === "true";

export const getRestaurant = async () => {
  if (!useMocks()) return api.get("/me/restaurant");
  try {
    return JSON.parse(localStorage.getItem(MOCK_KEY) || "null") || {};
  } catch {
    return {};
  }
};

export const updateRestaurant = async (payload) => {
  if (!useMocks()) return api.patch("/me/restaurant", payload);
  localStorage.setItem(MOCK_KEY, JSON.stringify(payload));
  return payload;
};
