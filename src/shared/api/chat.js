import api from "./api";
import axios from 'axios';
import { useAuthStore } from "../stores/authStore";

export const chatApi = {
  getAll: async () => {
    const response = await api.get("/chat");
    return response.data;
  },

  getOne: async (id) => {
    const response = await api.post(`/chat/direct/${id}`);
    return response.data;
  },
   createChat: async (id) => {
    const response = await api.post(`/chat/direct/${id}`);
    return response.data;
  },
  createChatGroup: async (name, ids, image, actId) => {  
  const token = useAuthStore.getState().getToken();
  const formData = new FormData();
  
  if (name) formData.append('name', name);
  
  // Важно: participantIds должен быть строкой JSON
  if (ids && Array.isArray(ids)) {
    // Преобразуем массив [1] в строку "[1]"
    const idsJson = JSON.stringify(ids);
    console.log('Sending participantIds as JSON string:', idsJson);
    formData.append('participantIds', idsJson); // Отправляем как строку JSON
  } else {
    console.error('ids is not an array:', ids);
  }
  
  if (image && image instanceof File) {
    formData.append('image', image);
  }
  
  if (actId) {
    formData.append('actId', actId);
  }
  
  const response = await axios.post(
    `${import.meta.env.VITE_API_URL}/chat/group`, 
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
  
    getMessages: async (id) => {
    const response = await api.get(`/chat/${id}/messages`);
    return response.data;
  },
 sendMessage: async (id, text, replyToId, forwardedFromId, file) => {
    const token = useAuthStore.getState().getToken();
    const formData = new FormData();
    

    if (text) formData.append('text', text);
    
   
    if (Number.isInteger(replyToId)) formData.append('replyToId', replyToId);
    if (Number.isInteger(forwardedFromId)) formData.append('forwardedFromId', forwardedFromId);
    
    
    if (file && file instanceof File) {
        formData.append('file', file);
    }

    const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/chat/${id}/messages`, 
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
deleteMessage: async (messageId) => {
    const response = await api.delete(`/chat/messages/${messageId}`);
    return response.data;
  },
  deleteChat: async (chatId) => {
    const response = await api.delete(`/chat/${chatId}`);
    return response.data;
  },
   muteChat: async (chatId) => {
    const response = await api.patch(`/chat/${chatId}/mute`);
    return response.data;
  },

  getInviteCode: async (chatId) => {
    const response = await api.get(`/chat/${chatId}/invite`);
    return response.data;
  },

  joinByInviteCode: async (code) => {
    const response = await api.post(`/chat/join/${code}`);
    return response.data;
  },
  
};
