import axios from "axios";

export function parseApiError(e) {
  if (!axios.isAxiosError(e)) {
    return { message: "Неизвестная ошибка", retryable: false };
  }

  const data = e.response?.data;
  const status = e.response?.status;

  return {
    status,
    errorCode: data?.errorCode,
    message: data?.message || e.message || "Ошибка запроса",
    retryable: Boolean(data?.retryable),
  };
}
