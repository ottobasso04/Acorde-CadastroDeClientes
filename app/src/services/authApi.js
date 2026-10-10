import { api } from "./api";

export async function login(email, password, role) {
  const response = await api.post("/auth/login", { email, password, role });
  return response.data;
}

export async function register(payload) {
  const response = await api.post("/auth/register", payload);
  return response.data;
}

export async function fetchCurrentUser() {
  const response = await api.get("/auth/me");
  return response.data.user;
}
