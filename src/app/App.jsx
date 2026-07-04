import { useEffect } from "react";

import { BrowserRouter, RouterProvider } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import PasswordProtection from "../features/Auth/PasswordProtection/PasswordProtection";
import { useAuthStore } from "../shared/stores/authStore";
import { useNotificationStore } from "../shared/stores/notificationStore";
import { notificationSocket } from "../shared/utils/notificationSocket";
import api from "../shared/api/api";
import { noticeApi } from "../shared/api/notifications";
import { profileApi } from "../shared/api/profile";
import { useI18nStore } from "../shared/stores/i18nStore";
import { normalizeLanguage } from "../shared/constants/languages";
import AchievementNotificationContainer from "../shared/ui/AchievementNotificationContainer/AchievementNotificationContainer";
import "./App.css";
import { router, technicalRouter } from "./router/Routers";

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

function App() {
  const { logout, isAuthenticated, setLocation, user } = useAuthStore();
  const { setNotifications, addNotification } = useNotificationStore();
  const isMaintenance = false;
  useEffect(() => {
    if (!isAuthenticated) return;

    const accessToken = getCookie("access_token");
    const refreshToken = getCookie("refresh_token");
    const storeToken = useAuthStore.getState().getToken?.();

    if (accessToken || refreshToken || storeToken) {
      return;
    }

    api
      .post("/auth/refresh")
      .catch(() => {
        logout();
        window.location.href = "/login";
      });
  }, [isAuthenticated, logout]);

  // Connect notification socket and load initial notifications
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      notificationSocket.connect(user.id);
      noticeApi.getNotifications(50).then((data) => {
        if (Array.isArray(data)) setNotifications(data);
      }).catch(() => {});
    } else {
      notificationSocket.disconnect();
    }
    return () => {};
  }, [isAuthenticated, user?.id]);

  // Fetch unread count and sync notifications on initial load
  useEffect(() => {
    if (isAuthenticated) {
      noticeApi.getUnreadCount().then((data) => {
        if (data && typeof data.count === 'number') {
          const store = useNotificationStore.getState();
          const currentUnread = store.notifications.filter((n) => !n.isRead).length;
          // If server has more unread than we have in store, refetch all notifications
          if (data.count > currentUnread) {
            noticeApi.getNotifications(100).then((notifications) => {
              if (Array.isArray(notifications)) {
                setNotifications(notifications);
              }
            }).catch(() => {});
          }
        }
      }).catch(() => {});

      // Periodically refresh unread count
      const interval = setInterval(() => {
        noticeApi.getUnreadCount().then((data) => {
          if (data && typeof data.count === 'number') {
            const store = useNotificationStore.getState();
            const currentUnread = store.notifications.filter((n) => !n.isRead).length;
            if (data.count > currentUnread) {
              noticeApi.getNotifications(100).then((notifications) => {
                if (Array.isArray(notifications)) {
                  setNotifications(notifications);
                }
              }).catch(() => {});
            }
          }
        }).catch(() => {});
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const fetchLocationByIP = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const locationData = {
          latitude: data.latitude,
          longitude: data.longitude,
        };
        setLocation(locationData);

        if (data.city && data.country_name) {
          await noticeApi.setCountry(data.country_name);
          await noticeApi.setCity(data.city);
        }
      } catch (e) {
        console.error("IP-based location failed:", e);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        fetchLocationByIP,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    } else {
      fetchLocationByIP();
    }
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    if (!isAuthenticated) return;

    profileApi.getSelectedlang()
      .then((data) => {
        const lang = data?.languages?.[0];
        if (lang) {
          useI18nStore.getState().setLocaleFromLanguageName(normalizeLanguage(lang));
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  return (
    <PasswordProtection>
      <RouterProvider router={isMaintenance ? technicalRouter : router} />
      <AchievementNotificationContainer />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </PasswordProtection>
  );
}

export default App;
