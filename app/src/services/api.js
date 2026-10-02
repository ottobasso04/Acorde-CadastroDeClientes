import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";

const API_PORT = 3333;

function resolveApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, "");
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `http://${window.location.hostname}:${API_PORT}`;
  }

  const expoHost = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  if (expoHost) {
    return `http://${expoHost.split(":")[0]}:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
}

export const API_URL = resolveApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

let currentToken = null;

export function setAuthToken(token) {
  currentToken = token;
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && currentToken && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallback = "Algo deu errado. Tente novamente.") {
  if (error.response?.data?.message) return error.response.data.message;

  if (!error.response) {
    return `Não foi possível conectar à API em ${API_URL}. Confira se o backend está rodando.`;
  }

  return fallback;
}

export function getFieldErrors(error) {
  return error.response?.data?.errors ?? {};
}
