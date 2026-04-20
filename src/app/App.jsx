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
    if (!isAuthenticated || !navigator.geolocation) {
      return;
    }

    console.log(" Запрос доступа к геолокации...");

    let watchId = null;

    const handleSuccess = (position) => {
      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      console.log(" Геолокация получена:", locationData);
      setLocation(locationData);
    };

    const handleError = (error) => {
      console.error(" Ошибка получения геолокации:", error.message);
      switch (error.code) {
        case error.PERMISSION_DENIED:
          console.error(" Пользователь отклонил запрос геолокации");
          break;
        case error.POSITION_UNAVAILABLE:
          console.error(" Местоположение недоступно");
          break;
        case error.TIMEOUT:
          console.error(" Тайм-аут запроса геолокации");
          break;
        default:
          console.error(" Неизвестная ошибка геолокации");
      }
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    });

    watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000,
      }
    );

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
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