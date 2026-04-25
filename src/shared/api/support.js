import api from "./api";
import axios from "axios";
import { useAuthStore } from "../stores/authStore";

export const supportApi = {
  createTicket: async (subject, message) => {
    const response = await api.post("/support/tickets", { title: subject, description: message });
    return response.data;
  },

  getMyTickets: async () => {
    const response = await api.get("/support/tickets/my");
    return response.data;
  },

  getTicketMessages: async (ticketId) => {
    const response = await api.get(`/support/tickets/${ticketId}/messages`);
    return response.data;
  },

  sendTicketMessage: async (ticketId, message, file = null) => {
    const token = useAuthStore.getState().getToken();
    const formData = new FormData();

    formData.append("message", message || "File attachment");
    if (file) {
      formData.append("file", file);
    }

    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/support/tickets/${ticketId}/message`,
      formData,
      {
        headers: {
          "Authorization": `Bearer ${token}`
        },
        withCredentials: true
      }
    );
    return response.data;
  },

  getAllTickets: async () => {
    const response = await api.get("/support/all");
    return response.data;
  },

  updateTicketStatus: async (ticketId, status) => {
    const response = await api.patch(`/support/tickets/${ticketId}/status`, { status });
    return response.data;
  },
};