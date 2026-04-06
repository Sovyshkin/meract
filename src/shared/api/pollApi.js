import api from "./api";

export const pollApi = {
  getActivePolls: (actId) => api.get(`/poll/act/${actId}`).then(r => r.data),
  vote: (pollId, optionId) => api.post(`/poll/${pollId}/vote`, { optionId }).then(r => r.data),
};
