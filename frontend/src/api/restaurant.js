import { api } from "./client";

export const getRestaurant = () => api.get("/me/restaurant");

export const updateRestaurant = (payload) =>
  api.patch("/me/restaurant", payload);
