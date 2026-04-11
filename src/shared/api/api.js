import axios from "axios";

import { useAuthStore } from "../stores/authStore";

let isRefreshing = false;
let failedQueue = [];
let isLoggingOut = false;

// ── Proactive token refresh ────────────────────────────────────────────────
let proactiveRefreshTimer = null;

const parseTokenExp = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const getCookieValue = (name) => {
  const match = document.cookie.match(new RegExp('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)'));
  return match ? match[2] : null;
};

const doProactiveRefresh = async () => {
  try {
    // Используем чистый axios (не наш api) чтобы не триггерить интерсептор
    const res = await axios.post(
      `${import.meta.env.VITE_API_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    // Бэкенд возвращает только { message }, токен устанавливается через cookie
    const newToken = res.data?.token || res.data?.accessToken || getCookieValue('access_token');
    if (newToken) {
      useAuthStore.getState().setToken(newToken);
      scheduleProactiveRefresh(newToken);
    }
  } catch {
    // Если проактивный refresh не удался — реактивный интерсептор справится при 401
  }
};

const scheduleProactiveRefresh = (token) => {
  if (proactiveRefreshTimer) clearTimeout(proactiveRefreshTimer);
  const expMs = parseTokenExp(token);
  if (!expMs) return;
  const delay = expMs - Date.now() - 60_000; // обновляем за 1 мин до истечения
  if (delay <= 0) {
    // Токен уже истёк или истекает менее чем через минуту — рефрешим немедленно
    proactiveRefreshTimer = setTimeout(doProactiveRefresh, 100);
    return;
  }
  proactiveRefreshTimer = setTimeout(doProactiveRefresh, delay);
};

// Запланировать refresh для уже имеющегося токена (после перезагрузки страницы)
const _initialToken = typeof window !== "undefined"
  ? (useAuthStore.getState().getToken?.() || localStorage.getItem("authToken"))
  : null;
if (_initialToken) scheduleProactiveRefresh(_initialToken);
// ──────────────────────────────────────────────────────────────────────────

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

// Обработка 401 (Unauthorized) — пробуем рефрешить токен
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (!error.response || status !== 401) {
      return Promise.reject(error);
    }

    // Для sign-in/refresh — не делаем logout, просто отклоняем промис
    // (компонент логина сам обработает ошибку и покажет сообщение)
    if (!originalRequest || originalRequest.url?.includes("/auth/")) {
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
      // Бэкенд возвращает только { message }, токен устанавливается через cookie
      const token = response.data?.token || response.data?.accessToken || getCookieValue('access_token');

      if (!token) throw new Error("No token in refresh response");

      useAuthStore.getState().setToken(token);
      scheduleProactiveRefresh(token);
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
