import { AI_TIMEOUT, api } from "./api";

export async function lookupCep(cep) {
  const response = await api.get(`/cep/${cep}`);
  return response.data;
}

export async function listProducts({ search = "", category = null, sort = "price_asc", lowStock = false, includeInactive = false } = {}) {
  const params = { sort };
  if (search.trim()) params.search = search.trim();
  if (category) params.category = category;
  if (lowStock) params.lowStock = "true";
  if (includeInactive) params.includeInactive = "true";
  const response = await api.get("/products", { params });
  return response.data;
}

export async function getProduct(id) {
  const response = await api.get(`/products/${id}`);
  return response.data;
}

export async function createProduct(product) {
  const response = await api.post("/products", product);
  return response.data;
}

export async function updateProduct(id, product) {
  const response = await api.put(`/products/${id}`, product);
  return response.data;
}

export async function addStock(id, entry) {
  const response = await api.post(`/products/${id}/stock`, entry);
  return response.data;
}

export async function listMovements(id) {
  const response = await api.get(`/products/${id}/movements`);
  return response.data;
}

export async function createOrder(items) {
  const response = await api.post("/orders", { items });
  return response.data;
}

export async function listOrders() {
  const response = await api.get("/orders");
  return response.data;
}

export async function getProfile() {
  const response = await api.get("/me/profile");
  return response.data;
}

export async function updateProfile(profile) {
  const response = await api.put("/me/profile", profile);
  return response.data;
}

export async function getDashboard(days) {
  const response = await api.get("/admin/dashboard", { params: { days } });
  return response.data;
}

export async function askRecommendations(filters) {
  const response = await api.post("/ai/recommendations", filters, { timeout: AI_TIMEOUT });
  return response.data;
}

export async function askAdminReport(days) {
  const response = await api.post("/ai/admin-report", { days }, { timeout: AI_TIMEOUT });
  return response.data;
}
