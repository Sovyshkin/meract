import api from "./api";
import axios from 'axios';
import { useAuthStore } from "../stores/authStore";
import { data } from "react-router-dom";
import { normalizeUserDisplay } from "../utils/displayName";

export const profileApi = {
  getProfile: async () => {
    const response = await api.get("/user/me");
    return normalizeUserDisplay(response.data);
  },
   updateFullname: async (newfullname) => {
    const data = {
        fullName: newfullname,
    }
    const response = await api.post("/user/change-full-name", data);
    return response.data;
  },
   updateUsername: async (newusername) => {
    const data = {
        login: newusername,
    }
    const response = await api.post("/user/change-username", data);
    return response.data;
  },
   getTimezone: async () => {
    const response = await api.get("/user/time-zones");
    return response.data;
  },
  updateTimezone: async (zone) => {
    const response = await api.post(`/user/select-time-zone?zone=${encodeURIComponent(zone)}`);
    return response.data;
  },
   getNotice: async () => {
    const response = await api.get("/user/notification-settings");
    return response.data;
  },
  updateNotice: async (newdata) => {
    const data = {
        notifyAll: newdata.all,
        notifyActProgress: newdata.progress,
        notifyGuildInvites: newdata.guild,
        notifyChatMentions: newdata.mentions,
        notifyActStatusRealtime: newdata.updates
    }
    const response = await api.post("/user/notification-settings", data);
    return response.data;
  },

  deletePhoto: async () => {
    const response = await api.delete("/user/delete-avatar");
    return response.data;
  },
  updatePhoto: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await api.post("/user/update-avatar", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

updateInfo: async (name, desc, avatarFile, coverFile, id) => {
    const token = useAuthStore.getState().getToken();
    const formData = new FormData();
    
    formData.append('name', name);
    formData.append('description', desc);

    // Отправляем толькоесли это действительно файл (объект File)
    // Если это строка (старый URL), серверу обновлять файл не нужно
    if (avatarFile instanceof File) {
        formData.append('photo', avatarFile);
    }
    if (coverFile instanceof File) {
        formData.append('cover', coverFile);
    }

    const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/guild/id=${id}`, 
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



  
  getLangs: async () => {
    const response = await api.get(`/user/communication-languages`);
    return response.data;
  },
  getSelectedlang: async () => {
    const response = await api.get(`/user/my-languages`);
    return response.data;
  },
  updateLang: async (languages) => {
    const response = await api.post(`/user/update-languages`, { languages });
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
  getUserById: async (id) => {
    const response = await api.get(`/user/get-user/${id}`);
    return normalizeUserDisplay(response.data);
  },
   status2fa: async () => {
    const response = await api.get(`/security/2fa/status`);
    return response.data;
  },
   generate2fa: async () => {
    const response = await api.post(`/security/2fa/generate`);
    return response.data;
  },
   confirm2fa: async (code) => {
    const response = await api.post(`/security/2fa/enable?token=${code}`);
    return response.data;
  },  
    getwhoCanMessage: async () => {
    const response = await api.get(`/security/who-can-message`);
    return response.data;
  },
   setwhoCanMessage: async (data) => {
  
    const response = await api.post(`/security/who-can-message`, data);
    return response.data;
  },
  //step1
  emailSendCode: async () => {
    const response = await api.post(`/security/change-email/send-code`);
    return response.data;
  },  
  //step2
  emailverify: async (code) => {
    const response = await api.post(`/security/change-email/verify-code?code=${code}`);
    return response.data;
  }, 
  //step3
  setNewEmail: async (email) => {
    const data = {newEmail: email}
    const response = await api.post(`/security/change-email/set-new-email`, data);
    return response.data;
  },  
  //step4
  confirmEmail: async (code) => {
    const response = await api.post(`/security/change-email/confirm?code=${code}`);
    return response.data;
  },
  passwordSendCode: async () => {
    const response = await api.post(`/security/change-password/send-code`);
    return response.data;
  }, 
  passwordconfirm: async (code, newpassword, repassword) => {
    const data = {
      password: newpassword,
      repassword: repassword
    }
    const response = await api.post(`/security/change-password/confirm?code=${code}`, data);
    return response.data;
  },
  
};
