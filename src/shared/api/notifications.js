import api from "./api";

export const noticeApi = {
  getNotifications: async (limit = 30, before) => {
    const params = { limit };
    if (before) params.before = before;
    const response = await api.get("/notifications", { params });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get("/notifications/unread-count");
    return response.data; // { count: number }
  },

  markRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllRead: async () => {
    const response = await api.patch("/notifications/read-all");
    return response.data;
  },

  deleteNotification: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },

  setCity: async (city) => {
    const response = await api.post(`/user/set-city`, { city });
    return response.data;
  },

  setCountry: async (country) => {
    const response = await api.post(`/user/set-country`, { country });
    return response.data;
  },
};
