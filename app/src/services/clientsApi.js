import { api } from "./api";

export async function listClients(search = "") {
  const term = search.trim();
  const response = await api.get("/clients", { params: term ? { search: term } : undefined });
  return response.data;
}

export async function getClient(id) {
  const response = await api.get(`/clients/${id}`);
  return response.data;
}

export async function createClient(client) {
  const response = await api.post("/clients", client);
  return response.data;
}

export async function updateClient(id, client) {
  const response = await api.put(`/clients/${id}`, client);
  return response.data;
}

export async function deleteClient(id) {
  await api.delete(`/clients/${id}`);
}
