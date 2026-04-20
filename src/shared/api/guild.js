import api from "./api";
import { useAuthStore } from "../stores/authStore";
import axios from "axios";
export const guildApi = {
  getAllGuilds: async () => {
    const response = await api.get("/guild/find-all");
    return response.data;
  },

  getGuild: async (id) => {
    const response = await api.get(`/guild/${id}`);
    return response.data;
  },
  joinGuild: async (id, message) => {
    const response = await api.post(`/guild/submit-request/${id}`, { message });
    return response.data;
  },
  updateInfo: async (name, desc, photo, cover, id) => {
    const token = useAuthStore.getState().getToken();
    const formData = new FormData();
    
    formData.append('name', name);
    formData.append('description', desc);

    if (photo instanceof File) {
        formData.append('photo', photo);
    }
    
    if (cover instanceof File) {
        formData.append('cover', cover);
    }

    const response = await axios.put(
       `${import.meta.env.VITE_API_URL}/guild/${id}`, 
        formData, 
        {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`
            },
            withCredentials: true
        }
    );

    return response.data;
},
inviteUser: async(user, id) =>{
  const data = await api.post(`/guild/invite-user?user=${user}&guildId=${id}`);
  return data.response;
},
kickUser: async(user, id) =>{
  const data = await api.post(`/guild/kick-out-user?userId=${user}&guildId=${id}`);
  return data.response;
},
getJoins: async(id) => {
  const response = await api.get(`/guild/${id}/join-requests`);
  return response.data; 
},
AcceptJoin: async(id) => {
  const response = await api.post(`/guild/join-requests/${id}/approve`);
  return response.data; 
},
RejectJoin: async(id) => {
  const response = await api.post(`/guild/join-requests/${id}/reject`);
  return response.data; 
},

getMyInvites: async () => {
  const response = await api.get("/guild/my-invites");
  return response.data;
},

acceptInvite: async (guildId) => {
  const response = await api.post(`/guild/${guildId}/invite/accept`);
  return response.data;
},

rejectInvite: async (guildId) => {
  const response = await api.post(`/guild/${guildId}/invite/reject`);
  return response.data;
},

};
