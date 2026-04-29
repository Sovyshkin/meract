import { useEffect } from "react";

import { BrowserRouter, RouterProvider } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import PasswordProtection from "../features/Auth/PasswordProtection/PasswordProtection";
import { useAuthStore } from "../shared/stores/authStore";
import { useNotificationStore } from "../shared/stores/notificationStore";
import { notificationSocket } from "../shared/utils/notificationSocket";
import { noticeApi } from "../shared/api/notifications";
import AchievementNotificationContainer from "../shared/ui/AchievementNotificationContainer/AchievementNotificationContainer";
import "./App.css";
import { router, technicalRouter } from "./router/Routers";

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
}

function App() {
  const { logout, isAuthenticated, setLocation, user } = useAuthStore();
  const { setNotifications } = useNotificationStore();
  const isMaintenance = false;
  useEffect(() => {
    const accessToken = getCookie("access_token");
    const refreshToken = getCookie("refresh_token");

    if (isAuthenticated && !accessToken && !refreshToken) {
      console.log(" No tokens in cookies, logging out...");
      logout();
      window.location.href = "/login";
    }
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
          await noticeApi.setCity(data.city);
          await noticeApi.setCountry(data.country_name);
        }
      } catch (e) {
        console.error("IP-based location failed:", e);
      }
    };

    fetchLocationByIP();
  }, [isAuthenticated, setLocation]);

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