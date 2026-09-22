import { api } from "./client";

export async function bootstrap(payload) {
  return api.post("/auth/bootstrap", payload);
}

export async function fetchCurrentUser() {
  return api.get("/auth/me");
}
