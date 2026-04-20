import api from "./api";

export const supportApi = {
  createTicket: async (subject, message) => {
    const response = await api.post("/support/tickets", { subject, message });
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

  sendTicketMessage: async (ticketId, message) => {
    const response = await api.post(`/support/tickets/${ticketId}/message`, { message });
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