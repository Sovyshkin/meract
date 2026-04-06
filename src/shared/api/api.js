import axios from "axios";

import { useAuthStore } from "../stores/authStore";

let isRefreshing = false;
let failedQueue = [];
let isLoggingOut = false;

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

const logoutAndRedirect = () => {
  if (isLoggingOut) return;
  isLoggingOut = true;

  // Сбрасываем все pending запросы
  processQueue(new Error("Unauthorized"), null);
  isRefreshing = false;

  // Очищаем cookies
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0].trim();
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    }
  });

  useAuthStore.getState().logout();
  window.location.replace("/login");
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Добавляем токен к каждому запросу
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Обработка 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Для запросов авторизации — сразу выходим
    if (!originalRequest || originalRequest.url?.includes("/auth/")) {
      logoutAndRedirect();
      return Promise.reject(error);
    }

    // Уже пробовали обновить токен — выходим
    if (originalRequest._retry) {
      logoutAndRedirect();
      return Promise.reject(error);
    }

    // Если уже идёт обновление — ставим в очередь
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch(() => {
          logoutAndRedirect();
          return Promise.reject(error);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const response = await api.post("/auth/refresh");
      const token = response.data?.token || response.data?.accessToken;

      if (!token) throw new Error("No token in refresh response");

      useAuthStore.getState().setToken(token);
      processQueue(null, token);
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return api(originalRequest);
    } catch {
      logoutAndRedirect();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
